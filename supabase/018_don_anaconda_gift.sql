-- Adds Don and His Anaconda as a separate premium live gift while retaining
-- Anaconda Heart as the regular 300-coin gift.
create or replace function public.zoo_live_spend_gift_coins(
  p_user_id uuid,
  p_gift_id text,
  p_event_id text,
  p_room_id text
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost bigint;
  v_balance bigint;
begin
  v_cost := case p_gift_id
    when 'paw' then 10
    when 'anaconda' then 300
    when 'lion' then 1000
    when 'don_anaconda' then 2500
    when 'sha_monkey' then 2500
    else null
  end;
  if v_cost is null then raise exception 'Unknown gift'; end if;
  if exists (select 1 from public.zoo_live_coin_ledger where provider_event_id = 'gift:' || p_event_id) then
    select balance_coins into v_balance from public.zoo_live_coin_wallets where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  update public.zoo_live_coin_wallets
  set balance_coins = balance_coins - v_cost, updated_at = now()
  where user_id = p_user_id and balance_coins >= v_cost
  returning balance_coins into v_balance;

  if not found then raise exception 'Insufficient coins'; end if;

  insert into public.zoo_live_coin_ledger(user_id, delta_coins, event_type, provider_event_id, details)
  values (p_user_id, -v_cost, 'gift', 'gift:' || p_event_id,
    jsonb_build_object('gift_id', p_gift_id, 'room_id', p_room_id));

  return v_balance;
end;
$$;

revoke all on function public.zoo_live_spend_gift_coins(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.zoo_live_spend_gift_coins(uuid, text, text, text) to service_role;
