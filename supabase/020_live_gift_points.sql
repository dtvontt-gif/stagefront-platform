-- One shared counter for all successfully spent Zoo Crew live gift coins.
create or replace function public.zoo_live_gift_points()
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
  where event_type in ('gift', 'refund');
$$;

revoke all on function public.zoo_live_gift_points() from public, anon, authenticated;
grant execute on function public.zoo_live_gift_points() to service_role;
