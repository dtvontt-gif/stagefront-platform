create table if not exists public.founding_members (
  founder_number bigint generated always as identity primary key,
  display_name text not null check (char_length(display_name) between 2 and 80),
  email text not null check (char_length(email) <= 254),
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  role text not null check (role in ('fan', 'artist', 'producer', 'host')),
  show_on_wall boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists founding_members_email_unique
  on public.founding_members (lower(email));

create unique index if not exists founding_members_username_unique
  on public.founding_members (lower(username));

alter table public.founding_members enable row level security;

drop policy if exists "Anyone may register as a founding member"
  on public.founding_members;

create policy "Anyone may register as a founding member"
  on public.founding_members
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public founders are visible"
  on public.founding_members;

create policy "Public founders are visible"
  on public.founding_members
  for select
  to anon, authenticated
  using (show_on_wall = true);

revoke update, delete on public.founding_members from anon, authenticated;
grant insert on public.founding_members to anon, authenticated;
grant select (founder_number, display_name, username, role, show_on_wall)
  on public.founding_members to anon, authenticated;
grant usage, select on sequence public.founding_members_founder_number_seq
  to anon, authenticated;
