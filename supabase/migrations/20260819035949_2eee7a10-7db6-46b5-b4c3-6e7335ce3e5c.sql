do $$
declare cid uuid := '6e5f8dde-0b78-4144-a637-e475b481f27f';
begin
  create temp table _res on commit drop as
    select id, session_id from public.reservations where customer_id = cid;

  delete from public.refunds where reservation_id in (select id from _res) or customer_id = cid;
  delete from public.payments where reservation_id in (select id from _res);
  delete from public.promotion_redemptions where reservation_id in (select id from _res) or customer_id = cid;
  delete from public.reservations where customer_id = cid;

  update public.sessions s set estado = 'published'
   where s.estado = 'full'
     and s.id in (select session_id from _res)
     and greatest(s.capacidad_maxima - public.session_reserved(s.id) - public.session_blocked(s.id), 0) > 0;

  delete from public.audit_logs where entity_type = 'reservation' and entity_id in (select id from _res);
  delete from public.customers where id = cid;
end $$;