create extension if not exists pgcrypto;

create table if not exists public.karaoke_v2_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  artist text check (artist is null or char_length(artist) <= 160),
  status text not null default 'draft' check (status in ('draft', 'uploading', 'queued', 'processing', 'ready', 'failed')),
  schema_version text not null default 'stagefront.karaoke-project/v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.karaoke_v2_project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.karaoke_v2_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  project_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, revision)
);

create table if not exists public.karaoke_v2_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.karaoke_v2_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'prepare' check (kind in ('prepare', 'separate', 'transcribe', 'align', 'render')),
  status text not null default 'pending_upload' check (status in ('pending_upload', 'queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress numeric(5,4) check (progress is null or progress between 0 and 1),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.karaoke_v2_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.karaoke_v2_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('source', 'instrumental', 'vocals', 'preview', 'ass', 'render')),
  bucket text not null,
  storage_key text not null,
  original_file_name text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  unique (bucket, storage_key)
);

create index if not exists karaoke_v2_projects_owner_created_idx on public.karaoke_v2_projects(owner_id, created_at desc);
create index if not exists karaoke_v2_jobs_project_idx on public.karaoke_v2_jobs(project_id, created_at desc);
create index if not exists karaoke_v2_assets_project_idx on public.karaoke_v2_assets(project_id, created_at desc);

alter table public.karaoke_v2_projects enable row level security;
alter table public.karaoke_v2_project_revisions enable row level security;
alter table public.karaoke_v2_jobs enable row level security;
alter table public.karaoke_v2_assets enable row level security;

create policy "karaoke v2 owners manage projects" on public.karaoke_v2_projects for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "karaoke v2 owners read revisions" on public.karaoke_v2_project_revisions for select to authenticated
  using (owner_id = auth.uid());
create policy "karaoke v2 owners insert revisions" on public.karaoke_v2_project_revisions for insert to authenticated
  with check (
    owner_id = auth.uid() and exists (
      select 1 from public.karaoke_v2_projects project
      where project.id = project_id and project.owner_id = auth.uid()
    )
  );
create policy "karaoke v2 owners read jobs" on public.karaoke_v2_jobs for select to authenticated
  using (owner_id = auth.uid());
create policy "karaoke v2 owners insert jobs" on public.karaoke_v2_jobs for insert to authenticated
  with check (
    owner_id = auth.uid() and exists (
      select 1 from public.karaoke_v2_projects project
      where project.id = project_id and project.owner_id = auth.uid()
    )
  );
create policy "karaoke v2 owners update jobs" on public.karaoke_v2_jobs for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "karaoke v2 owners read assets" on public.karaoke_v2_assets for select to authenticated
  using (owner_id = auth.uid());
create policy "karaoke v2 owners insert assets" on public.karaoke_v2_assets for insert to authenticated
  with check (
    owner_id = auth.uid() and exists (
      select 1 from public.karaoke_v2_projects project
      where project.id = project_id and project.owner_id = auth.uid()
    )
  );

grant select, insert, update on public.karaoke_v2_projects to authenticated;
grant select, insert on public.karaoke_v2_project_revisions to authenticated;
grant select, insert, update on public.karaoke_v2_jobs to authenticated;
grant select, insert on public.karaoke_v2_assets to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'karaoke-v2-source',
  'karaoke-v2-source',
  false,
  262144000,
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "karaoke v2 owners upload source audio" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'karaoke-v2-source'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.karaoke_v2_projects project
      where project.id::text = (storage.foldername(name))[2] and project.owner_id = auth.uid()
    )
  );
create policy "karaoke v2 owners read source audio" on storage.objects for select to authenticated
  using (bucket_id = 'karaoke-v2-source' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "karaoke v2 owners delete source audio" on storage.objects for delete to authenticated
  using (bucket_id = 'karaoke-v2-source' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.karaoke_v2_create_project(project_title text, project_artist text default null)
returns public.karaoke_v2_projects
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_project public.karaoke_v2_projects;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.karaoke_v2_projects (owner_id, title, artist)
  values (auth.uid(), trim(project_title), nullif(trim(project_artist), ''))
  returning * into created_project;

  insert into public.karaoke_v2_project_revisions (project_id, owner_id, revision, project_data)
  values (
    created_project.id,
    auth.uid(),
    1,
    jsonb_build_object(
      'schema', 'stagefront.karaoke-project/v1',
      'id', created_project.id,
      'ownerId', auth.uid(),
      'title', created_project.title,
      'artist', created_project.artist,
      'status', 'draft',
      'createdAt', created_project.created_at,
      'updatedAt', created_project.updated_at,
      'revision', 1,
      'assets', jsonb_build_array(),
      'lyrics', jsonb_build_object('offsetMs', 0, 'lines', jsonb_build_array()),
      'render', jsonb_build_object(
        'resolution', jsonb_build_object('width', 1920, 'height', 1080),
        'framesPerSecond', 30,
        'activeColor', '#f4b400',
        'inactiveColor', '#ffffff',
        'fontFamily', 'Arial',
        'safeAreaPercent', 5
      )
    )
  );

  insert into public.karaoke_v2_jobs (project_id, owner_id, kind, status)
  values (created_project.id, auth.uid(), 'prepare', 'pending_upload');

  return created_project;
end;
$$;

create or replace function public.karaoke_v2_complete_upload(
  target_project_id uuid,
  object_path text,
  original_file_name text,
  media_type text,
  object_size bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.karaoke_v2_projects
    where id = target_project_id and owner_id = auth.uid()
  ) then raise exception 'Project not found'; end if;

  if object_path not like auth.uid()::text || '/' || target_project_id::text || '/source/%' then
    raise exception 'Invalid storage path';
  end if;

  insert into public.karaoke_v2_assets (
    project_id, owner_id, kind, bucket, storage_key, original_file_name, mime_type, size_bytes
  ) values (
    target_project_id, auth.uid(), 'source', 'karaoke-v2-source', object_path,
    original_file_name, media_type, object_size
  ) on conflict (bucket, storage_key) do nothing;

  update public.karaoke_v2_projects set status = 'queued', updated_at = now()
  where id = target_project_id and owner_id = auth.uid();

  update public.karaoke_v2_jobs set status = 'queued', updated_at = now()
  where project_id = target_project_id and owner_id = auth.uid() and kind = 'prepare';
end;
$$;

grant execute on function public.karaoke_v2_create_project(text, text) to authenticated;
grant execute on function public.karaoke_v2_complete_upload(uuid, text, text, text, bigint) to authenticated;
