create table if not exists public.music_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 4100),
  required_words text check (required_words is null or char_length(required_words) <= 120),
  duration_seconds integer not null check (duration_seconds between 3 and 600),
  provider text not null,
  provider_generation_id text,
  bucket text not null default 'music-generations',
  storage_key text not null unique,
  mime_type text not null default 'audio/mpeg',
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists music_generations_owner_created_idx
  on public.music_generations(owner_id, created_at desc);

alter table public.music_generations enable row level security;

create policy "owners read music generations" on public.music_generations
  for select to authenticated using (owner_id = auth.uid());
create policy "owners delete music generations" on public.music_generations
  for delete to authenticated using (owner_id = auth.uid());

grant select, delete on public.music_generations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music-generations', 'music-generations', false, 104857600, array['audio/mpeg', 'audio/wav'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners read generated music files" on storage.objects
  for select to authenticated
  using (bucket_id = 'music-generations' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete generated music files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'music-generations' and (storage.foldername(name))[1] = auth.uid()::text);
