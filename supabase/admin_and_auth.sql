create table if not exists public.admin_wall_overrides (
  id bigint generated always as identity primary key,
  founder_number bigint not null references public.founding_members(founder_number),
  administrator_user_id uuid not null,
  administrator_email text not null,
  show_on_wall boolean not null,
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

alter table public.admin_wall_overrides enable row level security;
revoke all on public.admin_wall_overrides from anon, authenticated;

comment on table public.admin_wall_overrides is
  'Private audit history for administrator Wall of Founders visibility overrides.';
