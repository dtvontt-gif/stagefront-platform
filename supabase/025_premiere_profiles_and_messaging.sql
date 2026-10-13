alter table public.stagefront_profiles
  add column if not exists cover_image_path text,
  add column if not exists wallpaper_image_path text,
  add column if not exists theme_color text not null default '#f4b400',
  add column if not exists profile_layout text not null default 'spotlight',
  add column if not exists profile_song_url text,
  add column if not exists profile_song_title text;

alter table public.stagefront_profiles
  drop constraint if exists stagefront_profiles_theme_color_check,
  add constraint stagefront_profiles_theme_color_check
    check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists stagefront_profiles_layout_check,
  add constraint stagefront_profiles_layout_check
    check (profile_layout in ('spotlight', 'classic', 'creator'));

create table if not exists public.stagefront_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stagefront_conversation_members (
  conversation_id uuid not null references public.stagefront_conversations(id) on delete cascade,
  user_id uuid not null references public.stagefront_profiles(user_id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.stagefront_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.stagefront_conversations(id) on delete cascade,
  sender_id uuid not null references public.stagefront_profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  message_type text not null default 'text' check (message_type in ('text', 'live_invite', 'profile_share')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_stagefront_conversation_members_user
  on public.stagefront_conversation_members(user_id, joined_at desc);
create index if not exists idx_stagefront_messages_conversation
  on public.stagefront_messages(conversation_id, created_at desc);

alter table public.stagefront_conversations enable row level security;
alter table public.stagefront_conversation_members enable row level security;
alter table public.stagefront_messages enable row level security;
revoke all on public.stagefront_conversations from anon, authenticated;
revoke all on public.stagefront_conversation_members from anon, authenticated;
revoke all on public.stagefront_messages from anon, authenticated;

comment on column public.stagefront_profiles.profile_song_url is
  'HTTPS audio URL selected by the member. Playback starts only after a visitor presses play.';
