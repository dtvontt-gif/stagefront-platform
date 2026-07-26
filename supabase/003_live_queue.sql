create table if not exists public.live_queue_settings (
  id smallint primary key default 1 check (id = 1),
  is_open boolean not null default false,
  average_minutes integer not null default 5 check (average_minutes between 1 and 30),
  updated_at timestamptz not null default now()
);

insert into public.live_queue_settings (id, is_open, average_minutes)
values (1, false, 5)
on conflict (id) do nothing;

create table if not exists public.live_queue_entries (
  id bigint generated always as identity primary key,
  display_name text not null check (char_length(display_name) between 2 and 80),
  email text not null check (char_length(email) <= 254),
  song_title text not null check (char_length(song_title) between 1 and 120),
  song_artist text not null check (char_length(song_artist) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'completed', 'skipped', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_queue_entries_status_created_index
  on public.live_queue_entries (status, created_at);

alter table public.live_queue_settings enable row level security;
alter table public.live_queue_entries enable row level security;

revoke all on public.live_queue_settings from anon, authenticated;
revoke all on public.live_queue_entries from anon, authenticated;

comment on table public.live_queue_entries is
  'Private StageFront live queue. Public access is provided only through validated server routes.';
