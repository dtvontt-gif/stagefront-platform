alter table public.founding_members
  add column if not exists tiktok_profile_url text,
  add column if not exists tiktok_live_url text,
  add column if not exists is_live boolean not null default false,
  add column if not exists host_published boolean not null default false;

alter table public.founding_members
  drop constraint if exists founding_members_tiktok_profile_url_length,
  add constraint founding_members_tiktok_profile_url_length
    check (tiktok_profile_url is null or char_length(tiktok_profile_url) <= 500),
  drop constraint if exists founding_members_tiktok_live_url_length,
  add constraint founding_members_tiktok_live_url_length
    check (tiktok_live_url is null or char_length(tiktok_live_url) <= 500);

comment on column public.founding_members.host_published is
  'Administrator approval for public host directory visibility.';

comment on column public.founding_members.is_live is
  'Administrator-controlled live indicator for the public host directory.';
