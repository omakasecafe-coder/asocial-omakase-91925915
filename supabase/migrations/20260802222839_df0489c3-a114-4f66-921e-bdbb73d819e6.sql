-- ENUMS
create type public.app_role as enum ('admin','operator');
create type public.session_status as enum ('draft','published','full','closed','cancelled');
create type public.reservation_status as enum ('pending','confirmed','attended','no_show','cancelled');
create type public.payment_status as enum ('pending','partial','paid','refunded','complimentary');
create type public.payment_method as enum ('yape','plin','bank_transfer','card','payment_link','cash','complimentary','other');
create type public.block_reason as enum ('invitado','influencer','equipo','prensa','cortesia','otro');

-- UPDATED AT
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "staff read roles" on public.user_roles for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- first signed-in user becomes admin
create or replace function public.ensure_staff_role()
returns public.app_role language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); existing public.app_role;
begin
  if uid is null then return null; end if;
  select role into existing from public.user_roles where user_id = uid limit 1;
  if existing is not null then return existing; end if;
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles(user_id, role) values (uid,'admin');
    return 'admin';
  end if;
  return null;
end $$;
grant execute on function public.ensure_staff_role() to authenticated;

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text,
  phone text,
  instagram text,
  birthday date,
  acquisition_source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "staff manage customers" on public.customers for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

-- SESSIONS
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  capacidad_maxima integer not null default 6,
  precio_por_persona numeric(10,2) not null default 90,
  ubicacion text not null default 'asocial',
  estado public.session_status not null default 'draft',
  notas_internas text,
  descripcion_publica text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;
create policy "staff manage sessions" on public.sessions for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();

-- SEAT BLOCKS
create table public.seat_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  reason public.block_reason not null default 'otro',
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.seat_blocks to authenticated;
grant all on public.seat_blocks to service_role;
alter table public.seat_blocks enable row level security;
create policy "staff manage blocks" on public.seat_blocks for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- RESERVATIONS
create sequence public.booking_code_seq;
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  session_id uuid not null references public.sessions(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  guest_count integer not null check (guest_count > 0),
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  reservation_status public.reservation_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  source text not null default 'web',
  notes text,
  dietary_notes text,
  checked_in_at timestamptz,
  checked_in_by uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "staff manage reservations" on public.reservations for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger reservations_updated before update on public.reservations
  for each row execute function public.set_updated_at();
create index reservations_session_idx on public.reservations(session_id);
create index reservations_customer_idx on public.reservations(customer_id);

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_method public.payment_method not null default 'yape',
  status text not null default 'completed',
  transaction_reference text,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "staff manage payments" on public.payments for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create index payments_reservation_idx on public.payments(reservation_id);

-- WAITLIST
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  seats integer not null default 1 check (seats > 0),
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
alter table public.waitlist enable row level security;
create policy "staff manage waitlist" on public.waitlist for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- SETTINGS
create table public.settings (
  id boolean primary key default true check (id),
  business_name text not null default 'asocial',
  logo_url text,
  address text default 'Lima, Perú',
  currency text not null default 'PEN',
  timezone text not null default 'America/Lima',
  default_capacity integer not null default 6,
  default_price numeric(10,2) not null default 90,
  payment_methods text[] not null default array['yape','plin','bank_transfer','cash'],
  cancellation_policy text default 'Puedes cancelar o mover tu reserva hasta 24 horas antes.',
  confirmation_text text default 'Te enviaremos por WhatsApp la información necesaria para completar tu reserva.',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "staff read settings" on public.settings for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "staff write settings" on public.settings for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "staff read audit" on public.audit_logs for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "staff write audit" on public.audit_logs for insert to authenticated
  with check (public.is_staff(auth.uid()));

-- AVAILABILITY
create or replace function public.session_reserved(_session_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(guest_count),0)::int from public.reservations
  where session_id = _session_id and reservation_status <> 'cancelled'
$$;

create or replace function public.session_blocked(_session_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(quantity),0)::int from public.seat_blocks where session_id = _session_id
$$;

create or replace function public.session_available(_session_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id), 0)
  from public.sessions s where s.id = _session_id
$$;
grant execute on function public.session_reserved(uuid), public.session_blocked(uuid), public.session_available(uuid) to authenticated, anon, service_role;

create or replace view public.session_availability
with (security_invoker = true) as
select s.id as session_id, s.capacidad_maxima,
  public.session_reserved(s.id) as reserved,
  public.session_blocked(s.id) as blocked,
  greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0) as available
from public.sessions s;
grant select on public.session_availability to authenticated, service_role;

-- PUBLIC READ
create or replace function public.public_sessions()
returns table (
  id uuid, fecha date, hora_inicio time, hora_fin time,
  precio_por_persona numeric, ubicacion text, descripcion_publica text,
  capacidad_maxima integer, available integer
) language sql stable security definer set search_path = public as $$
  select s.id, s.fecha, s.hora_inicio, s.hora_fin, s.precio_por_persona, s.ubicacion,
         s.descripcion_publica, s.capacidad_maxima,
         greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0)
  from public.sessions s
  where s.estado in ('published','full')
    and (s.fecha > current_date or (s.fecha = current_date and s.hora_inicio > (now() at time zone 'America/Lima')::time))
  order by s.fecha, s.hora_inicio
$$;
grant execute on function public.public_sessions() to anon, authenticated, service_role;

-- BOOKING CODE
create or replace function public.next_booking_code(_fecha date)
returns text language sql volatile set search_path = public as $$
  select 'ASO-' || to_char(_fecha,'YYMMDD') || '-' || lpad((nextval('public.booking_code_seq') % 1000)::text, 3, '0')
$$;

-- ATOMIC RESERVATION CREATION
create or replace function public.create_reservation(
  _session_id uuid, _first_name text, _last_name text, _email text, _phone text,
  _guest_count integer, _notes text default null, _dietary_notes text default null,
  _source text default 'web', _customer_id uuid default null,
  _reservation_status public.reservation_status default 'pending',
  _payment_status public.payment_status default 'pending',
  _discount numeric default 0
) returns public.reservations
language plpgsql volatile security definer set search_path = public as $$
declare s public.sessions; cust uuid; avail int; code text; res public.reservations;
begin
  select * into s from public.sessions where id = _session_id for update;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  if s.estado not in ('published','full') and auth.uid() is null then
    raise exception 'Esta sesión no está disponible';
  end if;
  if _guest_count is null or _guest_count < 1 then raise exception 'Número de personas inválido'; end if;

  avail := greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0);
  if _guest_count > avail then
    raise exception 'Solo quedan % lugares en esta sesión', avail;
  end if;

  cust := _customer_id;
  if cust is null and _email is not null then
    select id into cust from public.customers where lower(email) = lower(_email) limit 1;
  end if;
  if cust is null and _phone is not null then
    select id into cust from public.customers where phone = _phone limit 1;
  end if;
  if cust is null then
    insert into public.customers(first_name,last_name,email,phone,acquisition_source)
    values (coalesce(_first_name,'Invitado'), coalesce(_last_name,''), _email, _phone, _source)
    returning id into cust;
  end if;

  code := public.next_booking_code(s.fecha);
  insert into public.reservations(booking_code, session_id, customer_id, guest_count, subtotal, discount, total,
    reservation_status, payment_status, source, notes, dietary_notes)
  values (code, s.id, cust, _guest_count, s.precio_por_persona * _guest_count, coalesce(_discount,0),
    s.precio_por_persona * _guest_count - coalesce(_discount,0),
    _reservation_status, _payment_status, _source, _notes, _dietary_notes)
  returning * into res;

  if greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0) = 0
     and s.estado = 'published' then
    update public.sessions set estado = 'full' where id = s.id;
  end if;

  return res;
end $$;
grant execute on function public.create_reservation(uuid,text,text,text,text,integer,text,text,text,uuid,public.reservation_status,public.payment_status,numeric) to anon, authenticated, service_role;

-- MOVE RESERVATION
create or replace function public.move_reservation(_reservation_id uuid, _new_session_id uuid)
returns public.reservations language plpgsql volatile security definer set search_path = public as $$
declare r public.reservations; s public.sessions; old_session uuid; avail int;
begin
  if not public.is_staff(auth.uid()) then raise exception 'No autorizado'; end if;
  select * into r from public.reservations where id = _reservation_id for update;
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  old_session := r.session_id;
  select * into s from public.sessions where id = _new_session_id for update;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  avail := greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0);
  if r.guest_count > avail then raise exception 'Solo quedan % lugares en esa sesión', avail; end if;

  update public.reservations
    set session_id = s.id,
        subtotal = s.precio_por_persona * r.guest_count,
        total = s.precio_por_persona * r.guest_count - r.discount
    where id = r.id returning * into r;

  update public.sessions set estado = case
    when greatest(capacidad_maxima - public.session_reserved(id) - public.session_blocked(id),0) = 0 and estado = 'published' then 'full'
    when greatest(capacidad_maxima - public.session_reserved(id) - public.session_blocked(id),0) > 0 and estado = 'full' then 'published'
    else estado end
  where id in (old_session, s.id);

  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_values, new_values)
  values (auth.uid(),'move_reservation','reservation', r.id,
    jsonb_build_object('session_id', old_session), jsonb_build_object('session_id', s.id));
  return r;
end $$;
grant execute on function public.move_reservation(uuid,uuid) to authenticated, service_role;

-- CANCEL RESERVATION
create or replace function public.cancel_reservation(_reservation_id uuid, _reason text)
returns public.reservations language plpgsql volatile security definer set search_path = public as $$
declare r public.reservations;
begin
  if not public.is_staff(auth.uid()) then raise exception 'No autorizado'; end if;
  update public.reservations
    set reservation_status = 'cancelled', cancelled_at = now(), cancellation_reason = _reason
    where id = _reservation_id returning * into r;
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  update public.sessions set estado = 'published'
    where id = r.session_id and estado = 'full';
  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_values)
  values (auth.uid(),'cancel_reservation','reservation', r.id, jsonb_build_object('reason', _reason));
  return r;
end $$;
grant execute on function public.cancel_reservation(uuid,text) to authenticated, service_role;

-- REGISTER PAYMENT
create or replace function public.register_payment(
  _reservation_id uuid, _amount numeric, _method public.payment_method,
  _paid_at timestamptz default now(), _reference text default null, _notes text default null
) returns public.reservations language plpgsql volatile security definer set search_path = public as $$
declare r public.reservations; total_paid numeric;
begin
  if not public.is_staff(auth.uid()) then raise exception 'No autorizado'; end if;
  select * into r from public.reservations where id = _reservation_id for update;
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  insert into public.payments(reservation_id, amount, payment_method, transaction_reference, paid_at, notes)
  values (r.id, _amount, _method, _reference, coalesce(_paid_at, now()), _notes);
  select coalesce(sum(amount),0) into total_paid from public.payments where reservation_id = r.id;
  update public.reservations set payment_status = case
      when _method = 'complimentary' then 'complimentary'::public.payment_status
      when total_paid >= r.total then 'paid'::public.payment_status
      when total_paid > 0 then 'partial'::public.payment_status
      else 'pending'::public.payment_status end,
    reservation_status = case when reservation_status = 'pending' and total_paid >= r.total then 'confirmed'::public.reservation_status else reservation_status end
  where id = r.id returning * into r;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_values)
  values (auth.uid(),'register_payment','reservation', r.id, jsonb_build_object('amount',_amount,'method',_method));
  return r;
end $$;
grant execute on function public.register_payment(uuid,numeric,public.payment_method,timestamptz,text,text) to authenticated, service_role;

-- PUBLIC WAITLIST
create or replace function public.join_waitlist(_session_id uuid, _name text, _phone text, _email text, _seats integer)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare wid uuid;
begin
  if not exists (select 1 from public.sessions where id = _session_id and estado in ('published','full')) then
    raise exception 'Sesión no disponible';
  end if;
  insert into public.waitlist(session_id,name,phone,email,seats)
  values (_session_id, _name, _phone, _email, greatest(coalesce(_seats,1),1)) returning id into wid;
  return wid;
end $$;
grant execute on function public.join_waitlist(uuid,text,text,text,integer) to anon, authenticated, service_role;

-- SEED
insert into public.settings(id) values (true);

insert into public.customers(id, first_name, last_name, email, phone, instagram, acquisition_source) values
 ('11111111-1111-1111-1111-111111111111','Ana','Pérez','ana@example.com','+51999111222','@ana.pz','instagram'),
 ('22222222-2222-2222-2222-222222222222','Lucía','Ramos','lucia@example.com','+51999333444','@lu.ramos','referida'),
 ('33333333-3333-3333-3333-333333333333','Diego','Ruiz','diego@example.com','+51999555666',null,'web'),
 ('44444444-4444-4444-4444-444444444444','Marco','Ríos','marco@example.com','+51999777888','@marcorios','instagram');

insert into public.sessions(id, fecha, hora_inicio, hora_fin, capacidad_maxima, precio_por_persona, ubicacion, estado, descripcion_publica, notas_internas) values
 ('aaaaaaa1-0000-4000-8000-000000000001', current_date, '18:00', '19:30', 6, 90, 'Barranco', 'published', 'Una cata guiada de seis pasos, en silencio compartido.', 'Traer molino de repuesto.'),
 ('aaaaaaa1-0000-4000-8000-000000000002', current_date, '20:00', '21:30', 5, 90, 'Barranco', 'full', 'Sesión de noche, cafés lavados y naturales.', null),
 ('aaaaaaa1-0000-4000-8000-000000000003', current_date + 5, '19:00', '20:30', 6, 90, 'Barranco', 'published', 'Omakase de origen: tres fincas, una conversación.', null),
 ('aaaaaaa1-0000-4000-8000-000000000004', current_date + 6, '17:00', '18:30', 6, 90, 'Barranco', 'published', 'Tarde lenta, filtrados y una pausa.', null);

insert into public.reservations(booking_code, session_id, customer_id, guest_count, subtotal, discount, total, reservation_status, payment_status, source) values
 ('ASO-000001-001','aaaaaaa1-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111',2,180,0,180,'confirmed','paid','web'),
 ('ASO-000001-002','aaaaaaa1-0000-4000-8000-000000000001','22222222-2222-2222-2222-222222222222',2,180,0,180,'confirmed','paid','instagram'),
 ('ASO-000001-003','aaaaaaa1-0000-4000-8000-000000000001','33333333-3333-3333-3333-333333333333',1,90,0,90,'pending','pending','web'),
 ('ASO-000001-004','aaaaaaa1-0000-4000-8000-000000000002','44444444-4444-4444-4444-444444444444',2,180,0,180,'confirmed','paid','web'),
 ('ASO-000001-005','aaaaaaa1-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111',3,270,0,270,'confirmed','paid','whatsapp'),
 ('ASO-000001-006','aaaaaaa1-0000-4000-8000-000000000003','22222222-2222-2222-2222-222222222222',2,180,0,180,'pending','pending','web'),
 ('ASO-000001-007','aaaaaaa1-0000-4000-8000-000000000003','33333333-3333-3333-3333-333333333333',1,90,0,90,'confirmed','paid','web');

insert into public.payments(reservation_id, amount, payment_method, paid_at)
select r.id, r.total, 'yape'::public.payment_method, now()
from public.reservations r where r.payment_status = 'paid';

select setval('public.booking_code_seq', 20);