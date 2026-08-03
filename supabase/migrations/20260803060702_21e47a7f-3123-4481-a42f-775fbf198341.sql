-- 1. attendance
create type public.attendance_status as enum ('pending','arrived','no_show');

alter table public.reservations
  add column attendance_status public.attendance_status not null default 'pending',
  add column attendance_at timestamptz,
  add column attendance_by uuid,
  add column confirmation_email_sent_at timestamptz;

update public.reservations set attendance_status = 'arrived', attendance_at = coalesce(checked_in_at, now())
  where reservation_status = 'attended';
update public.reservations set attendance_status = 'no_show' where reservation_status = 'no_show';

-- 2. payments status
create type public.payment_txn_status as enum ('pending','paid','refunded','partially_refunded','cancelled');

alter table public.payments alter column status drop default;
alter table public.payments
  alter column status type public.payment_txn_status
  using (case lower(status)
    when 'completed' then 'paid'
    when 'paid' then 'paid'
    when 'pending' then 'pending'
    when 'refunded' then 'refunded'
    when 'partially_refunded' then 'partially_refunded'
    when 'cancelled' then 'cancelled'
    else 'paid' end)::public.payment_txn_status;
alter table public.payments alter column status set default 'paid'::public.payment_txn_status;
alter table public.payments
  add column confirmed_at timestamptz,
  add column email_sent_at timestamptz,
  add column status_updated_at timestamptz,
  add column status_updated_by uuid;

update public.payments set confirmed_at = paid_at where status = 'paid';

-- 3. refunds
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  original_amount numeric not null,
  amount numeric not null check (amount > 0),
  reason text not null default '',
  status text not null default 'processed',
  processed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.refunds to authenticated;
grant all on public.refunds to service_role;
alter table public.refunds enable row level security;
create policy "staff manage refunds" on public.refunds for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- 4. staff users
create table public.staff_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  full_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.staff_users to authenticated;
grant all on public.staff_users to service_role;
alter table public.staff_users enable row level security;
create policy "staff read staff users" on public.staff_users for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage staff users" on public.staff_users for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger staff_users_updated_at before update on public.staff_users
  for each row execute function public.set_updated_at();

insert into public.staff_users (user_id, email, full_name, active)
select ur.user_id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'full_name',''), true
from public.user_roles ur join auth.users u on u.id = ur.user_id
on conflict (user_id) do nothing;

-- active users only are staff
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.user_roles ur
    left join public.staff_users su on su.user_id = ur.user_id
    where ur.user_id = _user_id and coalesce(su.active, true)
  )
$$;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.user_roles ur
    left join public.staff_users su on su.user_id = ur.user_id
    where ur.user_id = _user_id and ur.role = _role and coalesce(su.active, true)
  )
$$;

-- 5. email templates
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  subject text not null default '',
  title text not null default '',
  body text not null default '',
  signature text not null default '',
  extra_info text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.email_templates to authenticated;
grant all on public.email_templates to service_role;
alter table public.email_templates enable row level security;
create policy "staff read templates" on public.email_templates for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage templates" on public.email_templates for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.email_templates to authenticated;
create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

insert into public.email_templates (template_key, name, subject, title, body, signature, extra_info) values
('reservation_confirmed','Confirmación de reserva','Tu reserva en asocial está confirmada','Reserva confirmada',
 'Hola {{customer_name}},

Tu reserva en asocial · café omakase está confirmada.

Fecha: {{reservation_date}}
Hora: {{reservation_time}}
Personas: {{party_size}}
Total: {{reservation_total}}

Formas de pago:
{{payment_options}}',
 'Nos vemos pronto,
asocial · café omakase',
 'Llega 5 minutos antes. La experiencia dura aproximadamente 90 minutos.'),
('payment_confirmed','Confirmación de pago','Recibimos tu pago · asocial','Pago recibido',
 'Hola {{customer_name}},

Confirmamos la recepción de tu pago.

Monto pagado: {{payment_amount}}
Estado del pago: {{payment_status}}
Fecha: {{reservation_date}}
Hora: {{reservation_time}}
Personas: {{party_size}}
Estado de la reserva: {{reservation_status}}',
 'Gracias,
asocial · café omakase',
 '');

-- 6. settings payment instructions
alter table public.settings add column payment_instructions text not null default
'Yape / Plin: 999 999 999 (asocial)
Transferencia: BCP 000-0000000-0-00
Envíanos el comprobante por WhatsApp para confirmar tu reserva.';