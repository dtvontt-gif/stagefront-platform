create table if not exists public.video_credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  kind text not null,
  reference text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.video_credit_balances enable row level security;
alter table public.video_credit_events enable row level security;

create or replace function public.stagefront_grant_video_credits(
  target_user uuid,
  credit_amount integer,
  event_kind text,
  event_ref text,
  event_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare current_balance integer;
begin
  if credit_amount <= 0 then raise exception 'credit_amount must be positive'; end if;
  insert into video_credit_events(user_id, delta, kind, reference, metadata)
  values (target_user, credit_amount, event_kind, event_ref, coalesce(event_metadata, '{}'::jsonb))
  on conflict (reference) do nothing;
  if not found then
    select balance into current_balance from video_credit_balances where user_id = target_user;
    return coalesce(current_balance, 0);
  end if;
  insert into video_credit_balances(user_id, balance, updated_at)
  values (target_user, credit_amount, now())
  on conflict (user_id) do update
    set balance = video_credit_balances.balance + excluded.balance, updated_at = now()
  returning balance into current_balance;
  return current_balance;
end;
$$;

create or replace function public.stagefront_consume_video_credit(target_user uuid, event_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare updated_rows integer;
begin
  if exists (select 1 from video_credit_events where reference = event_ref) then return true; end if;
  update video_credit_balances
    set balance = balance - 1, updated_at = now()
    where user_id = target_user and balance > 0;
  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then return false; end if;
  insert into video_credit_events(user_id, delta, kind, reference)
    values (target_user, -1, 'generation', event_ref);
  return true;
end;
$$;

revoke all on function public.stagefront_grant_video_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.stagefront_consume_video_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.stagefront_grant_video_credits(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.stagefront_consume_video_credit(uuid, text) to service_role;
