create table if not exists public.stagefront_audio_station (
  id integer primary key default 1 check (id = 1),
  station_name text not null default 'StageFront Live Radio',
  show_title text not null default 'The StageFront Live Show',
  stream_url text,
  tiktok_live_url text,
  is_live boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.stagefront_audio_station (id)
values (1)
on conflict (id) do nothing;

alter table public.stagefront_audio_station enable row level security;

comment on table public.stagefront_audio_station is
  'The public StageFront audio player configuration. Updated only through the protected server API.';
