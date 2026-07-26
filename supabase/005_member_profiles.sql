alter table public.founding_members
  add column if not exists profile_image_path text,
  add column if not exists profile_image_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stagefront-profile-images',
  'stagefront-profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.founding_members.profile_image_path is
  'Storage path for the member profile photo. The original stays unframed; StageFront adds its curtain frame in the interface.';
