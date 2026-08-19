-- Repair the promotion resolver deployed in 20260818212849.
-- The local PL/pgSQL variable "code" collided with promotions.code.
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
  selected_session public.sessions;
  selected_promotion public.promotions;
  normalized_code text := nullif(btrim(upper(coalesce(_promo_code, ''))), '');
  customer_uuid uuid;
begin
  select session_row.*
    into selected_session
    from public.sessions as session_row
   where session_row.id = _session_id;

  if selected_session.id is null then
    return null;
  end if;

  select customer_row.id
    into customer_uuid
    from public.customers as customer_row
   where (
          nullif(btrim(lower(coalesce(_email, ''))), '') is not null
          and lower(customer_row.email) = btrim(lower(_email))
        )
      or (
          nullif(btrim(coalesce(_phone, '')), '') is not null
          and customer_row.phone = btrim(_phone)
        )
   limit 1;

  for selected_promotion in
    select promotion_row.*
      from public.promotions as promotion_row
     where promotion_row.active
       and (
         case
           when normalized_code is null then promotion_row.application_type = 'automatic'
           else promotion_row.application_type = 'code'
             and upper(btrim(promotion_row.code)) = normalized_code
         end
       )
       and _guest_count >= promotion_row.min_guests
       and (
         promotion_row.max_guests is null
         or _guest_count <= promotion_row.max_guests
       )
      and (
        promotion_row.starts_on is null
        or current_date >= promotion_row.starts_on
      )
      and (
        promotion_row.ends_on is null
        or current_date <= promotion_row.ends_on
      )
       and (
         coalesce(array_length(promotion_row.session_ids, 1), 0) = 0
         or _session_id = any(promotion_row.session_ids)
       )
     order by promotion_row.priority desc, promotion_row.created_at desc
  loop
    if selected_promotion.usage_limit is not null then
      if (
        select count(*)
          from public.promotion_redemptions as redemption
          join public.reservations as reservation
            on reservation.id = redemption.reservation_id
         where redemption.promotion_id = selected_promotion.id
           and reservation.reservation_status <> 'cancelled'
      ) >= selected_promotion.usage_limit then
        continue;
      end if;
    end if;

    if selected_promotion.usage_limit_per_customer is not null
       and customer_uuid is not null then
      if (
        select count(*)
          from public.promotion_redemptions as redemption
          join public.reservations as reservation
            on reservation.id = redemption.reservation_id
         where redemption.promotion_id = selected_promotion.id
           and redemption.customer_id = customer_uuid
           and reservation.reservation_status <> 'cancelled'
      ) >= selected_promotion.usage_limit_per_customer then
        continue;
      end if;
    end if;

    return selected_promotion;
  end loop;

  return null;
end $$;

revoke all on function public.pick_promotion(uuid, integer, text, text, text)
  from public, anon, authenticated;