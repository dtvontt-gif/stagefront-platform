-- Gift points belong to one exact live-room session. A newly created room
-- therefore begins at zero, even when the same owner starts it later.
create or replace function public.zoo_live_gift_points(p_room_id text)
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select greatest(
    0,
    coalesce(-sum(delta_coins), 0)
  )::bigint
  from public.zoo_live_coin_ledger
  where event_type in ('gift', 'refund')
    and details ->> 'room_id' = p_room_id;
$$;

revoke all on function public.zoo_live_gift_points(text) from public, anon, authenticated;
grant execute on function public.zoo_live_gift_points(text) to service_role;
