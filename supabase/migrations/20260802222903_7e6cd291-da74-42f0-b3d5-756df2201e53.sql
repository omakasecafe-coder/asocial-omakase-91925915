revoke execute on all functions in schema public from public, anon;

grant execute on function public.public_sessions() to anon, authenticated, service_role;
grant execute on function public.join_waitlist(uuid,text,text,text,integer) to anon, authenticated, service_role;
grant execute on function public.create_reservation(uuid,text,text,text,text,integer,text,text,text,uuid,public.reservation_status,public.payment_status,numeric) to anon, authenticated, service_role;

grant execute on function public.has_role(uuid,public.app_role) to authenticated, service_role;
grant execute on function public.is_staff(uuid) to authenticated, service_role;
grant execute on function public.ensure_staff_role() to authenticated, service_role;
grant execute on function public.session_reserved(uuid) to authenticated, service_role;
grant execute on function public.session_blocked(uuid) to authenticated, service_role;
grant execute on function public.session_available(uuid) to authenticated, service_role;
grant execute on function public.next_booking_code(date) to authenticated, service_role;
grant execute on function public.move_reservation(uuid,uuid) to authenticated, service_role;
grant execute on function public.cancel_reservation(uuid,text) to authenticated, service_role;
grant execute on function public.register_payment(uuid,numeric,public.payment_method,timestamptz,text,text) to authenticated, service_role;
grant execute on function public.set_updated_at() to authenticated, service_role;