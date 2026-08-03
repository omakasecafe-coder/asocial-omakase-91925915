-- 1. Lock down internal helper functions
REVOKE EXECUTE ON FUNCTION public.next_booking_code(date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.session_reserved(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.session_blocked(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.session_available(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;

-- 2. Harden create_reservation: privileged options require staff
CREATE OR REPLACE FUNCTION public.create_reservation(_session_id uuid, _first_name text, _last_name text, _email text, _phone text, _guest_count integer, _notes text DEFAULT NULL::text, _dietary_notes text DEFAULT NULL::text, _source text DEFAULT 'web'::text, _customer_id uuid DEFAULT NULL::uuid, _reservation_status reservation_status DEFAULT 'pending'::reservation_status, _payment_status payment_status DEFAULT 'pending'::payment_status, _discount numeric DEFAULT 0)
 RETURNS reservations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.sessions; cust uuid; avail int; code text; res public.reservations;
begin
  if (_reservation_status <> 'pending'
      or _payment_status <> 'pending'
      or coalesce(_discount,0) <> 0
      or _customer_id is not null
      or coalesce(_source,'web') = 'admin')
     and not public.is_staff(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select * into s from public.sessions where id = _session_id for update;
  if s.id is null then raise exception 'Sesión no encontrada'; end if;
  if s.estado not in ('published','full') and not public.is_staff(auth.uid()) then
    raise exception 'Esta sesión no está disponible';
  end if;
  if _guest_count is null or _guest_count < 1 then raise exception 'Número de personas inválido'; end if;

  avail := greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id),0);
  if _guest_count > avail then
    raise exception 'Solo quedan % lugares en esta sesión', avail;
  end if;

  cust := _customer_id;
  if cust is null and _email is not null and _email <> '' then
    select id into cust from public.customers where lower(email) = lower(_email) limit 1;
  end if;
  if cust is null and _phone is not null and _phone <> '' then
    select id into cust from public.customers where phone = _phone limit 1;
  end if;
  if cust is null then
    insert into public.customers(first_name,last_name,email,phone,acquisition_source)
    values (coalesce(_first_name,'Invitado'), coalesce(_last_name,''), nullif(_email,''), nullif(_phone,''), _source)
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
end $function$;

REVOKE EXECUTE ON FUNCTION public.create_reservation(uuid,text,text,text,text,integer,text,text,text,uuid,reservation_status,payment_status,numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid,text,text,text,text,integer,text,text,text,uuid,reservation_status,payment_status,numeric) TO authenticated, service_role;

-- 3. Narrow public booking entry point for website visitors
CREATE OR REPLACE FUNCTION public.public_create_reservation(
  _session_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _guest_count integer,
  _notes text DEFAULT NULL,
  _dietary_notes text DEFAULT NULL
)
RETURNS TABLE(booking_code text, total numeric, guest_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare res public.reservations;
begin
  if _first_name is null or btrim(_first_name) = '' then raise exception 'Nombre requerido'; end if;
  if _guest_count is null or _guest_count < 1 or _guest_count > 12 then raise exception 'Número de personas inválido'; end if;

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
    'pending'::public.reservation_status,
    'pending'::public.payment_status,
    0
  );

  booking_code := res.booking_code;
  total := res.total;
  guest_count := res.guest_count;
  return next;
end $function$;

REVOKE EXECUTE ON FUNCTION public.public_create_reservation(uuid,text,text,text,text,integer,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_create_reservation(uuid,text,text,text,text,integer,text,text) TO anon, authenticated, service_role;

-- 4. One-time staff bootstrap only
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS staff_bootstrap_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.ensure_staff_role()
 RETURNS app_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); existing public.app_role; allowed boolean;
begin
  if uid is null then return null; end if;
  select role into existing from public.user_roles where user_id = uid limit 1;
  if existing is not null then return existing; end if;

  select staff_bootstrap_enabled into allowed from public.settings where id = true for update;
  if coalesce(allowed,false) and not exists (select 1 from public.user_roles) then
    insert into public.user_roles(user_id, role) values (uid,'admin');
    update public.settings set staff_bootstrap_enabled = false where id = true;
    insert into public.audit_logs(user_id, action, entity_type, entity_id, new_values)
    values (uid, 'bootstrap_admin', 'user_role', uid, jsonb_build_object('role','admin'));
    return 'admin';
  end if;
  return null;
end $function$;

REVOKE EXECUTE ON FUNCTION public.ensure_staff_role() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_staff_role() TO authenticated, service_role;