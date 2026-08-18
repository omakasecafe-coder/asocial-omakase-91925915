
alter table public.reservations
  add column if not exists promotion_id uuid,
  add column if not exists promotion_name text,
  add column if not exists promotion_code text;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  application_type text not null default 'automatic' check (application_type in ('automatic','code')),
  code text unique,
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed','free')),
  discount_value numeric not null default 0,
  max_discount numeric,
  min_guests integer not null default 1,
  max_guests integer,
  starts_on date,
  ends_on date,
  usage_limit integer,
  usage_limit_per_customer integer,
  session_ids uuid[] not null default '{}',
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  promotion_name text not null default '',
  promotion_code text,
  discount_type text not null default 'percentage',
  discount_value numeric not null default 0,
  discount_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.reservations
  drop constraint if exists reservations_promotion_id_fkey;
alter table public.reservations
  add constraint reservations_promotion_id_fkey
  foreign key (promotion_id) references public.promotions(id) on delete set null;

grant select, insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
grant select, insert, update, delete on public.promotion_redemptions to authenticated;
grant all on public.promotion_redemptions to service_role;

alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

drop policy if exists "staff manage promotions" on public.promotions;
create policy "staff manage promotions" on public.promotions
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage promotion redemptions" on public.promotion_redemptions;
create policy "staff manage promotion redemptions" on public.promotion_redemptions
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

create or replace function public.pick_promotion(
  _session_id uuid,
  _guest_count integer,
  _promo_code text,
  _email text,
  _phone text
) returns public.promotions
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  s public.sessions;
  p public.promotions;
  code text := nullif(btrim(upper(coalesce(_promo_code,''))), '');
  cust uuid;
begin
  select * into s from public.sessions where id = _session_id;
  if s.id is null then return null; end if;

  select c.id into cust from public.customers c
   where (nullif(btrim(lower(coalesce(_email,''))),'') is not null and lower(c.email) = btrim(lower(_email)))
      or (nullif(btrim(coalesce(_phone,'')),'') is not null and c.phone = btrim(_phone))
   limit 1;

  for p in
    select * from public.promotions pr
     where pr.active
       and (case when code is null then pr.application_type = 'automatic'
                 else pr.application_type = 'code' and upper(pr.code) = code end)
       and _guest_count >= pr.min_guests
       and (pr.max_guests is null or _guest_count <= pr.max_guests)
       and (pr.starts_on is null or s.fecha >= pr.starts_on)
       and (pr.ends_on is null or s.fecha <= pr.ends_on)
       and (coalesce(array_length(pr.session_ids,1),0) = 0 or _session_id = any(pr.session_ids))
     order by pr.priority desc, pr.created_at desc
  loop
    if p.usage_limit is not null then
      if (select count(*) from public.promotion_redemptions r
            join public.reservations res on res.id = r.reservation_id
           where r.promotion_id = p.id and res.reservation_status <> 'cancelled') >= p.usage_limit then
        continue;
      end if;
    end if;
    if p.usage_limit_per_customer is not null and cust is not null then
      if (select count(*) from public.promotion_redemptions r
            join public.reservations res on res.id = r.reservation_id
           where r.promotion_id = p.id and r.customer_id = cust
             and res.reservation_status <> 'cancelled') >= p.usage_limit_per_customer then
        continue;
      end if;
    end if;
    return p;
  end loop;

  return null;
end $$;

create or replace function public.public_price_quote(
  _session_id uuid,
  _guest_count integer,
  _promo_code text default '',
  _email text default '',
  _phone text default ''
) returns table(
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
set search_path to 'public'
as $$
declare
  s public.sessions;
  p public.promotions;
  d numeric := 0;
begin
  select * into s from public.sessions where id = _session_id;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  subtotal := round(coalesce(s.precio_por_persona,0) * greatest(coalesce(_guest_count,1),1), 2);

  p := public.pick_promotion(_session_id, greatest(coalesce(_guest_count,1),1), _promo_code, _email, _phone);
  if p.id is not null then
    if p.discount_type = 'free' then
      d := subtotal;
    elsif p.discount_type = 'fixed' then
      d := least(p.discount_value, subtotal);
    else
      d := round(subtotal * p.discount_value / 100.0, 2);
      if p.max_discount is not null then d := least(d, p.max_discount); end if;
    end if;
    promotion_id := p.id;
    promotion_name := p.name;
    promotion_code := p.code;
    promotion_application_type := p.application_type;
  end if;

  discount := greatest(least(d, subtotal), 0);
  total := subtotal - discount;
  return next;
end $$;

drop function if exists public.public_create_reservation(uuid, text, text, text, text, integer, text, text);

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
  res public.reservations;
  q record;
  is_free boolean := false;
begin
  if _first_name is null or btrim(_first_name) = '' then raise exception 'Nombre requerido'; end if;
  if _guest_count is null or _guest_count < 1 or _guest_count > 12 then raise exception 'Número de personas inválido'; end if;

  select * into q from public.public_price_quote(_session_id, _guest_count, _promo_code, _email, _phone);
  is_free := q.total = 0 and q.discount > 0;

  res := public.create_reservation(
    _session_id,
    left(btrim(_first_name), 80),
    left(btrim(coalesce(_last_name,'')), 80),
    left(btrim(coalesce(_email,'')), 160),
    left(btrim(coalesce(_phone,'')), 30),
    _guest_count,
    left(coalesce(_notes,''), 500),
    left(coalesce(_dietary_notes,''), 500),
    'web',
    null,
    case when is_free then 'confirmed'::public.reservation_status else 'pending'::public.reservation_status end,
    case when is_free then 'complimentary'::public.payment_status else 'pending'::public.payment_status end,
    q.discount
  );

  update public.reservations r
     set promotion_id = q.promotion_id,
         promotion_name = q.promotion_name,
         promotion_code = q.promotion_code
   where r.id = res.id;

  if q.promotion_id is not null then
    insert into public.promotion_redemptions(
      promotion_id, reservation_id, customer_id, promotion_name, promotion_code,
      discount_type, discount_value, discount_amount)
    select q.promotion_id, res.id, res.customer_id, coalesce(q.promotion_name,''), q.promotion_code,
           p.discount_type, p.discount_value, q.discount
      from public.promotions p where p.id = q.promotion_id;
  end if;

  booking_code := res.booking_code;
  total := q.total;
  guest_count := res.guest_count;
  subtotal := q.subtotal;
  discount := q.discount;
  promotion_name := q.promotion_name;
  promotion_code := q.promotion_code;
  reservation_status := case when is_free then 'confirmed'::public.reservation_status else 'pending'::public.reservation_status end;
  payment_status := case when is_free then 'complimentary'::public.payment_status else 'pending'::public.payment_status end;
  return next;
end $$;

revoke all on function public.pick_promotion(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.public_price_quote(uuid, integer, text, text, text) to anon, authenticated;
grant execute on function public.public_create_reservation(uuid, text, text, text, text, integer, text, text, text) to anon, authenticated;
