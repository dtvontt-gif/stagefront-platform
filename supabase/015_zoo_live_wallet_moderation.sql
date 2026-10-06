-- Zoo Crew live wallet foundation. Coin purchases are stored value for in-room gifts only;
-- coins are non-transferable and have no cash-out or creator payout path.
create table if not exists public.zoo_live_coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_coins bigint not null default 0 check (balance_coins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.zoo_live_coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paypal_order_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  coins bigint not null check (coins > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paypal_capture_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.zoo_live_coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta_coins bigint not null check (delta_coins <> 0),
  event_type text not null check (event_type in ('purchase','gift')),
  provider_event_id text not null unique,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.zoo_live_room_moderators (
  room_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists public.zoo_live_room_restrictions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  restriction text not null check (restriction in ('comment_mute','blocked')),
  actor_user_id uuid not null references auth.users(id),
  reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (room_id, user_id, restriction)
);

create table if not exists public.zoo_live_reports (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reported_name text not null,
  comment_id text,
  comment_body text,
  reason text not null check (length(reason) between 3 and 500),
  status text not null default 'new' check (status in ('new','reviewed','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists zoo_live_reports_created_idx on public.zoo_live_reports(status, created_at desc);
create index if not exists zoo_live_room_restrictions_lookup_idx on public.zoo_live_room_restrictions(room_id, user_id, restriction);

alter table public.zoo_live_coin_wallets enable row level security;
alter table public.zoo_live_coin_purchases enable row level security;
alter table public.zoo_live_coin_ledger enable row level security;
alter table public.zoo_live_room_moderators enable row level security;
alter table public.zoo_live_room_restrictions enable row level security;
alter table public.zoo_live_reports enable row level security;

revoke all on public.zoo_live_coin_wallets from anon, authenticated;
revoke all on public.zoo_live_coin_purchases from anon, authenticated;
revoke all on public.zoo_live_coin_ledger from anon, authenticated;
revoke all on public.zoo_live_room_moderators from anon, authenticated;
revoke all on public.zoo_live_room_restrictions from anon, authenticated;
revoke all on public.zoo_live_reports from anon, authenticated;

create or replace function public.zoo_live_fulfill_coin_order(
  p_order_id text,
  p_capture_id text,
  p_amount_cents integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.zoo_live_coin_purchases%rowtype;
begin
  select * into v_order
  from public.zoo_live_coin_purchases
  where paypal_order_id = p_order_id
  for update;

  if not found then raise exception 'Unknown coin order'; end if;
  if v_order.status = 'paid' then return; end if;
  if v_order.status <> 'pending' or v_order.amount_cents <> p_amount_cents then
    raise exception 'Coin order does not match capture';
  end if;

  insert into public.zoo_live_coin_ledger(user_id, delta_coins, event_type, provider_event_id, details)
  values (v_order.user_id, v_order.coins, 'purchase', 'paypal-capture:' || p_capture_id,
    jsonb_build_object('order_id', p_order_id, 'amount_cents', p_amount_cents));

  insert into public.zoo_live_coin_wallets(user_id, balance_coins)
  values (v_order.user_id, v_order.coins)
  on conflict (user_id) do update
  set balance_coins = public.zoo_live_coin_wallets.balance_coins + excluded.balance_coins,
      updated_at = now();

  update public.zoo_live_coin_purchases
  set status = 'paid', paypal_capture_id = p_capture_id, paid_at = now()
  where id = v_order.id;
end;
$$;

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
  v_cost := case p_gift_id when 'paw' then 10 when 'anaconda' then 300 when 'lion' then 1000 else null end;
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

revoke all on function public.zoo_live_fulfill_coin_order(text, text, integer) from public, anon, authenticated;
revoke all on function public.zoo_live_spend_gift_coins(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.zoo_live_fulfill_coin_order(text, text, integer) to service_role;
grant execute on function public.zoo_live_spend_gift_coins(uuid, text, text, text) to service_role;
