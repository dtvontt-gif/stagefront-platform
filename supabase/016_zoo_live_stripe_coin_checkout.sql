-- Idempotently credit a paid Stripe Checkout Session to a Zoo Coin wallet.
create or replace function public.zoo_live_credit_stripe_coin_purchase(
  p_user_id uuid,
  p_session_id text,
  p_amount_cents integer,
  p_coins bigint
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ledger_id uuid;
  v_balance bigint;
begin
  if p_amount_cents <= 0 or p_coins <= 0 then
    raise exception 'Invalid Zoo Coin purchase';
  end if;

  insert into public.zoo_live_coin_ledger(
    user_id,
    delta_coins,
    event_type,
    provider_event_id,
    details
  )
  values (
    p_user_id,
    p_coins,
    'purchase',
    'stripe-checkout:' || p_session_id,
    jsonb_build_object(
      'provider', 'stripe',
      'checkout_session_id', p_session_id,
      'amount_cents', p_amount_cents
    )
  )
  on conflict (provider_event_id) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is not null then
    insert into public.zoo_live_coin_wallets(user_id, balance_coins)
    values (p_user_id, p_coins)
    on conflict (user_id) do update
    set balance_coins = public.zoo_live_coin_wallets.balance_coins + excluded.balance_coins,
        updated_at = now()
    returning balance_coins into v_balance;
  else
    select balance_coins into v_balance
    from public.zoo_live_coin_wallets
    where user_id = p_user_id;
  end if;

  return coalesce(v_balance, 0);
end;
$$;

revoke all on function public.zoo_live_credit_stripe_coin_purchase(uuid, text, integer, bigint)
from public, anon, authenticated;
grant execute on function public.zoo_live_credit_stripe_coin_purchase(uuid, text, integer, bigint)
to service_role;
