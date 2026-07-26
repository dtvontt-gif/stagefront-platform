create table if not exists public.golden_voices_settings (
  id smallint primary key default 1 check (id = 1),
  season_title text not null default 'Golden Voices — Season One',
  upcoming_show_at timestamptz,
  finals_at timestamptz,
  current_round text not null default 'Auditions' check (char_length(current_round) between 2 and 60),
  registration_open boolean not null default true,
  voting_open boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.golden_voices_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.golden_voices_contestants (
  id bigint generated always as identity primary key,
  season_title text not null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  email text not null check (char_length(email) <= 254),
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  song_title text not null check (char_length(song_title) between 1 and 120),
  song_artist text not null check (char_length(song_artist) between 1 and 120),
  status text not null default 'registered'
    check (status in ('registered', 'confirmed', 'performed', 'advanced', 'eliminated', 'finalist', 'winner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists golden_voices_season_email_unique
  on public.golden_voices_contestants (season_title, lower(email));

create unique index if not exists golden_voices_season_username_unique
  on public.golden_voices_contestants (season_title, lower(username));

create table if not exists public.golden_voices_votes (
  id bigint generated always as identity primary key,
  contestant_id bigint not null references public.golden_voices_contestants(id) on delete cascade,
  round_name text not null check (char_length(round_name) between 2 and 60),
  voter_token uuid not null,
  created_at timestamptz not null default now(),
  unique (round_name, voter_token)
);

create index if not exists golden_voices_votes_contestant_index
  on public.golden_voices_votes (contestant_id);

alter table public.golden_voices_settings enable row level security;
alter table public.golden_voices_contestants enable row level security;
alter table public.golden_voices_votes enable row level security;

revoke all on public.golden_voices_settings from anon, authenticated;
revoke all on public.golden_voices_contestants from anon, authenticated;
revoke all on public.golden_voices_votes from anon, authenticated;

comment on table public.golden_voices_votes is
  'Private voting records. Public totals are provided only through the StageFront server API.';
