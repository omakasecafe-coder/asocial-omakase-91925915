-- Promotions and discount codes
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  application_type text not null check (application_type in ('automatic','code')),
  code text,
  discount_type text not null check (discount_type in ('percentage','fixed','free')),
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  min_guests integer not null default 1 check (min_guests > 0),
  max_guests integer check (max_guests is null or max_guests >= min_guests),
  starts_on date,
  ends_on date,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_limit_per_customer integer check (usage_limit_per_customer is null or usage_limit_per_customer > 0),
  session_ids uuid[] not null default '{}',
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (application_type = 'automatic' and code is null)
    or (application_type = 'code' and code is not null and btrim(code) <> '')
  ),
  check (discount_type = 'free' or discount_value > 0),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index promotions_code_unique
  on public.promotions (upper(btrim(code)))
  where code is not null;
create index promotions_active_idx on public.promotions(active, starts_on, ends_on);

grant select, insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
create policy "staff manage promotions" on public.promotions for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger promotions_updated before update on public.promotions
  for each row execute function public.set_updated_at();

alter table public.reservations
  add column promotion_id uuid references public.promotions(id) on delete set null,
  add column promotion_name text,
  add column promotion_code text;
create index reservations_promotion_idx on public.reservations(promotion_id);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  promotion_name text not null,
  promotion_code text,
  discount_type text not null,
  discount_value numeric(10,2) not null,
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);
create index promotion_redemptions_promotion_idx on public.promotion_redemptions(promotion_id);
create index promotion_redemptions_customer_idx on public.promotion_redemptions(customer_id);

grant select on public.promotion_redemptions to authenticated;
grant all on public.promotion_redemptions to service_role;
alter table public.promotion_redemptions enable row level security;
create policy "staff read promotion redemptions" on public.promotion_redemptions for select to authenticated
  using (public.is_staff(auth.uid()));

create or replace function public.public_price_quote(
  _session_id uuid,
  _guest_count integer,
  _promo_code text default null,
  _email text default null,
  _phone text default null
)
returns table (
  subtotal numeric,
  discount numeric,
  total numeric,
  promotion_id uuid,
  promotion_name text,
  promotion_code text,
  promotion_application_type text
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  selected_session public.sessions%rowtype;
  selected_promotion public.promotions%rowtype;
  customer_uuid uuid;
  normalized_code text := upper(btrim(coalesce(_promo_code,'')));
begin
  if _guest_count is null or _guest_count < 1 or _guest_count > 12 then
    raise exception 'Número de personas inválido';
  end if;

  select * into selected_session from public.sessions where id = _session_id;
  if selected_session.id is null then raise exception 'Sesión no encontrada'; end if;

  if coalesce(btrim(_email),'') <> '' then
    select id into customer_uuid from public.customers where lower(email) = lower(btrim(_email)) limit 1;
  end if;
  if customer_uuid is null and coalesce(btrim(_phone),'') <> '' then
    select id into customer_uuid from public.customers where phone = btrim(_phone) limit 1;
  end if;

  subtotal := round(selected_session.precio_por_persona * _guest_count, 2);

  if normalized_code <> '' and not exists (
    select 1
    from public.promotions p
    where p.active
      and p.application_type = 'code'
      and upper(btrim(p.code)) = normalized_code
      and (p.starts_on is null or p.starts_on <= current_date)
      and (p.ends_on is null or p.ends_on >= current_date)
      and _guest_count >= p.min_guests
      and (p.max_guests is null or _guest_count <= p.max_guests)
      and (cardinality(p.session_ids) = 0 or _session_id = any(p.session_ids))
      and (p.usage_limit is null or (
        select count(*) from public.promotion_redemptions pr
        join public.reservations r on r.id = pr.reservation_id
        where pr.promotion_id = p.id and r.reservation_status <> 'cancelled'
      ) < p.usage_limit)
      and (p.usage_limit_per_customer is null or customer_uuid is null or (
        select count(*) from public.promotion_redemptions pr
        join public.reservations r on r.id = pr.reservation_id
        where pr.promotion_id = p.id
          and pr.customer_id = customer_uuid
          and r.reservation_status <> 'cancelled'
      ) < p.usage_limit_per_customer)
  ) then
    raise exception 'El código promocional no es válido o ya no está disponible';
  end if;

  select p.* into selected_promotion
  from public.promotions p
  where p.active
    and (p.starts_on is null or p.starts_on <= current_date)
    and (p.ends_on is null or p.ends_on >= current_date)
    and _guest_count >= p.min_guests
    and (p.max_guests is null or _guest_count <= p.max_guests)
    and (cardinality(p.session_ids) = 0 or _session_id = any(p.session_ids))
    and (p.usage_limit is null or (
      select count(*) from public.promotion_redemptions pr
      join public.reservations r on r.id = pr.reservation_id
      where pr.promotion_id = p.id and r.reservation_status <> 'cancelled'
    ) < p.usage_limit)
    and (p.usage_limit_per_customer is null or customer_uuid is null or (
      select count(*) from public.promotion_redemptions pr
      join public.reservations r on r.id = pr.reservation_id
      where pr.promotion_id = p.id
        and pr.customer_id = customer_uuid
        and r.reservation_status <> 'cancelled'
    ) < p.usage_limit_per_customer)
    and (
      p.application_type = 'automatic'
      or (normalized_code <> '' and p.application_type = 'code' and upper(btrim(p.code)) = normalized_code)
    )
  order by
    least(
      subtotal,
      coalesce(p.max_discount, subtotal),
      case p.discount_type
        when 'percentage' then subtotal * p.discount_value / 100
        when 'fixed' then p.discount_value
        when 'free' then subtotal
        else 0
      end
    ) desc,
    p.priority desc,
    p.created_at asc
  limit 1;

  if selected_promotion.id is null then
    discount := 0;
    total := subtotal;
    promotion_id := null;
    promotion_name := null;
    promotion_code := null;
    promotion_application_type := null;
    return next;
    return;
  end if;

  discount := round(least(
    subtotal,
    coalesce(selected_promotion.max_discount, subtotal),
    case selected_promotion.discount_type
      when 'percentage' then subtotal * selected_promotion.discount_value / 100
      when 'fixed' then selected_promotion.discount_value
      when 'free' then subtotal
      else 0
    end
  ), 2);
  total := greatest(subtotal - discount, 0);
  promotion_id := selected_promotion.id;
  promotion_name := selected_promotion.name;
  promotion_code := selected_promotion.code;
  promotion_application_type := selected_promotion.application_type;
  return next;
end $function$;

revoke execute on function public.public_price_quote(uuid,integer,text,text,text) from public;
grant execute on function public.public_price_quote(uuid,integer,text,text,text) to anon, authenticated, service_role;

drop function if exists public.public_create_reservation(uuid,text,text,text,text,integer,text,text);

create function public.public_create_reservation(
  _session_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _guest_count integer,
  _notes text default null,
  _dietary_notes text default null,
  _promo_code text default null
)
returns table(
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
set search_path = public
as $function$
declare
  selected_session public.sessions%rowtype;
  customer_uuid uuid;
  available_seats integer;
  reservation_row public.reservations%rowtype;
  quote record;
  locked_promotion public.promotions%rowtype;
begin
  if _first_name is null or btrim(_first_name) = '' then raise exception 'Nombre requerido'; end if;
  if _guest_count is null or _guest_count < 1 or _guest_count > 12 then raise exception 'Número de personas inválido'; end if;

  select * into selected_session from public.sessions where id = _session_id for update;
  if selected_session.id is null then raise exception 'Sesión no encontrada'; end if;
  if selected_session.estado not in ('published','full') then raise exception 'Esta sesión no está disponible'; end if;

  available_seats := greatest(
    selected_session.capacidad_maxima - public.session_reserved(selected_session.id) - public.session_blocked(selected_session.id),
    0
  );
  if _guest_count > available_seats then raise exception 'Solo quedan % lugares en esta sesión', available_seats; end if;

  if coalesce(btrim(_email),'') <> '' then
    select id into customer_uuid from public.customers where lower(email) = lower(btrim(_email)) limit 1;
  end if;
  if customer_uuid is null and coalesce(btrim(_phone),'') <> '' then
    select id into customer_uuid from public.customers where phone = btrim(_phone) limit 1;
  end if;
  if customer_uuid is null then
    insert into public.customers(first_name,last_name,email,phone,acquisition_source)
    values (
      left(btrim(_first_name),80),
      left(btrim(coalesce(_last_name,'')),80),
      nullif(left(btrim(coalesce(_email,'')),160),''),
      nullif(left(btrim(coalesce(_phone,'')),30),''),
      'web'
    ) returning id into customer_uuid;
  end if;

  select * into quote from public.public_price_quote(
    _session_id, _guest_count, _promo_code, _email, _phone
  );

  if quote.promotion_id is not null then
    select * into locked_promotion from public.promotions where id = quote.promotion_id for update;
    select * into quote from public.public_price_quote(
      _session_id, _guest_count, _promo_code, _email, _phone
    );
  end if;

  insert into public.reservations(
    booking_code, session_id, customer_id, guest_count, subtotal, discount, total,
    reservation_status, payment_status, source, notes, dietary_notes,
    promotion_id, promotion_name, promotion_code
  ) values (
    public.next_booking_code(selected_session.fecha),
    selected_session.id,
    customer_uuid,
    _guest_count,
    quote.subtotal,
    quote.discount,
    quote.total,
    case when quote.total = 0 then 'confirmed'::public.reservation_status else 'pending'::public.reservation_status end,
    case when quote.total = 0 then 'complimentary'::public.payment_status else 'pending'::public.payment_status end,
    'web',
    left(coalesce(_notes,''),500),
    left(coalesce(_dietary_notes,''),500),
    quote.promotion_id,
    quote.promotion_name,
    quote.promotion_code
  ) returning * into reservation_row;

  if quote.promotion_id is not null then
    insert into public.promotion_redemptions(
      promotion_id, reservation_id, customer_id, promotion_name, promotion_code,
      discount_type, discount_value, discount_amount
    )
    select
      p.id, reservation_row.id, customer_uuid, p.name, p.code,
      p.discount_type, p.discount_value, quote.discount
    from public.promotions p where p.id = quote.promotion_id;
  end if;

  if greatest(
    selected_session.capacidad_maxima - public.session_reserved(selected_session.id) - public.session_blocked(selected_session.id),
    0
  ) = 0 and selected_session.estado = 'published' then
    update public.sessions set estado = 'full' where id = selected_session.id;
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
end $function$;

revoke execute on function public.public_create_reservation(uuid,text,text,text,text,integer,text,text,text) from public;
grant execute on function public.public_create_reservation(uuid,text,text,text,text,integer,text,text,text)
  to anon, authenticated, service_role;

insert into public.email_templates(template_key, name, subject, title, body, signature, extra_info)
values (
  'complimentary_confirmed',
  'Confirmación de reserva gratuita',
  'Tu reserva en asocial está confirmada',
  'Reserva confirmada',
  'Hola {{customer_name}},

Tu reserva en asocial · café omakase está confirmada.

Código: {{booking_code}}
Fecha: {{reservation_date}}
Hora: {{reservation_time}}
Personas: {{party_size}}
Promoción: {{promotion_name}}
Descuento: {{reservation_discount}}
Total: {{reservation_total}}

No necesitas realizar ningún pago.',
  'Nos vemos pronto,
asocial · café omakase',
  'Llega 5 minutos antes. La experiencia dura aproximadamente 90 minutos.'
)
on conflict (template_key) do nothing;
