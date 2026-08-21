-- Allow anonymous checkout to create complimentary reservations without
-- weakening the privileged public.create_reservation helper.
--
-- The public wrapper introduced in 20260818212849 delegated to
-- public.create_reservation with confirmed/complimentary/discount values.
-- That helper intentionally rejects those privileged arguments for anonymous
-- callers, which caused free promo checkouts to fail with "No autorizado".

create or replace function public.public_create_reservation(
  _session_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _guest_count integer,
  _notes text default '',
  _dietary_notes text default '',
  _promo_code text default ''
) returns table(
  booking_code text,
  total numeric,
  guest_count integer,
  subtotal numeric,
  discount numeric,
  promotion_name text,
  promotion_code text,
  reservation_status public.reservation_status,
  payment_status public.payment_status
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  selected_session public.sessions;
  selected_customer_id uuid;
  available_seats integer;
  reservation_row public.reservations;
  quote record;
  locked_promotion public.promotions;
  normalized_promo_code text := nullif(btrim(upper(coalesce(_promo_code, ''))), '');
begin
  if _first_name is null or btrim(_first_name) = '' then
    raise exception 'Nombre requerido';
  end if;
  if _guest_count is null or _guest_count < 1 or _guest_count > 12 then
    raise exception 'Número de personas inválido';
  end if;

  select session_row.*
    into selected_session
    from public.sessions as session_row
   where session_row.id = _session_id
   for update;

  if selected_session.id is null then
    raise exception 'Sesión no encontrada';
  end if;
  if selected_session.estado not in ('published', 'full') then
    raise exception 'Esta sesión no está disponible';
  end if;

  available_seats := greatest(
    selected_session.capacidad_maxima
      - public.session_reserved(selected_session.id)
      - public.session_blocked(selected_session.id),
    0
  );
  if _guest_count > available_seats then
    raise exception 'Solo quedan % lugares en esta sesión', available_seats;
  end if;

  if coalesce(btrim(_email), '') <> '' then
    select customer_row.id
      into selected_customer_id
      from public.customers as customer_row
     where lower(customer_row.email) = lower(btrim(_email))
     limit 1;
  end if;
  if selected_customer_id is null and coalesce(btrim(_phone), '') <> '' then
    select customer_row.id
      into selected_customer_id
      from public.customers as customer_row
     where customer_row.phone = btrim(_phone)
     limit 1;
  end if;
  if selected_customer_id is null then
    insert into public.customers(
      first_name,
      last_name,
      email,
      phone,
      acquisition_source
    ) values (
      left(btrim(_first_name), 80),
      left(btrim(coalesce(_last_name, '')), 80),
      nullif(left(btrim(coalesce(_email, '')), 160), ''),
      nullif(left(btrim(coalesce(_phone, '')), 30), ''),
      'web'
    )
    returning id into selected_customer_id;
  end if;

  select *
    into quote
    from public.public_price_quote(
      _session_id,
      _guest_count,
      normalized_promo_code,
      _email,
      _phone
    );

  if normalized_promo_code is not null and quote.promotion_id is null then
    raise exception 'Código promocional inválido o no disponible';
  end if;

  -- Serialize redemptions for the same promotion. Recalculate after acquiring
  -- the lock so usage limits cannot be exceeded by concurrent checkouts.
  if quote.promotion_id is not null then
    select promotion_row.*
      into locked_promotion
      from public.promotions as promotion_row
     where promotion_row.id = quote.promotion_id
     for update;

    select *
      into quote
      from public.public_price_quote(
        _session_id,
        _guest_count,
        normalized_promo_code,
        _email,
        _phone
      );

    if normalized_promo_code is not null and quote.promotion_id is null then
      raise exception 'Código promocional inválido o no disponible';
    end if;
  end if;

  insert into public.reservations(
    booking_code,
    session_id,
    customer_id,
    guest_count,
    subtotal,
    discount,
    total,
    reservation_status,
    payment_status,
    source,
    notes,
    dietary_notes,
    promotion_id,
    promotion_name,
    promotion_code
  ) values (
    public.next_booking_code(selected_session.fecha),
    selected_session.id,
    selected_customer_id,
    _guest_count,
    quote.subtotal,
    quote.discount,
    quote.total,
    case
      when quote.total = 0 and quote.discount > 0
        then 'confirmed'::public.reservation_status
      else 'pending'::public.reservation_status
    end,
    case
      when quote.total = 0 and quote.discount > 0
        then 'complimentary'::public.payment_status
      else 'pending'::public.payment_status
    end,
    'web',
    left(coalesce(_notes, ''), 500),
    left(coalesce(_dietary_notes, ''), 500),
    quote.promotion_id,
    quote.promotion_name,
    quote.promotion_code
  )
  returning * into reservation_row;

  if quote.promotion_id is not null then
    insert into public.promotion_redemptions(
      promotion_id,
      reservation_id,
      customer_id,
      promotion_name,
      promotion_code,
      discount_type,
      discount_value,
      discount_amount
    )
    select
      promotion_row.id,
      reservation_row.id,
      selected_customer_id,
      promotion_row.name,
      promotion_row.code,
      promotion_row.discount_type,
      promotion_row.discount_value,
      quote.discount
    from public.promotions as promotion_row
    where promotion_row.id = quote.promotion_id;
  end if;

  if greatest(
    selected_session.capacidad_maxima
      - public.session_reserved(selected_session.id)
      - public.session_blocked(selected_session.id),
    0
  ) = 0 and selected_session.estado = 'published' then
    update public.sessions
       set estado = 'full'
     where id = selected_session.id;
  end if;

  booking_code := reservation_row.booking_code;
  total := reservation_row.total;
  guest_count := reservation_row.guest_count;
  subtotal := reservation_row.subtotal;
  discount := reservation_row.discount;
  promotion_name := reservation_row.promotion_name;
  promotion_code := reservation_row.promotion_code;
  reservation_status := reservation_row.reservation_status;
  payment_status := reservation_row.payment_status;
  return next;
end $$;

revoke all on function public.public_create_reservation(
  uuid, text, text, text, text, integer, text, text, text
) from public;

grant execute on function public.public_create_reservation(
  uuid, text, text, text, text, integer, text, text, text
) to anon, authenticated, service_role;
