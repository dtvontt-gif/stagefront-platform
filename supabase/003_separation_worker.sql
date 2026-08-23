alter table public.karaoke_v2_jobs
  add column if not exists attempts integer not null default 0,
  add column if not exists lease_expires_at timestamptz;

create index if not exists karaoke_v2_jobs_claim_idx
  on public.karaoke_v2_jobs(status, created_at) where kind = 'prepare';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('karaoke-v2-stems', 'karaoke-v2-stems', false, 1073741824, array['audio/wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "karaoke v2 owners read stems" on storage.objects for select to authenticated
  using (bucket_id = 'karaoke-v2-stems' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.karaoke_v2_claim_separation_job()
returns table(job_id uuid, project_id uuid, owner_id uuid, attempts integer, source_storage_key text, source_mime_type text)
language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  select j.id into claimed_id from public.karaoke_v2_jobs j
  where j.kind = 'prepare' and (j.status = 'queued' or (j.status = 'running' and j.lease_expires_at < now()))
  order by j.created_at for update skip locked limit 1;
  if claimed_id is null then return; end if;

  update public.karaoke_v2_jobs j set status = 'running', progress = 0.02,
    attempts = j.attempts + 1, lease_expires_at = now() + interval '60 minutes', error = null, updated_at = now()
  where j.id = claimed_id;
  update public.karaoke_v2_projects p set status = 'processing', updated_at = now()
  where p.id = (select j.project_id from public.karaoke_v2_jobs j where j.id = claimed_id);

  return query select j.id, j.project_id, j.owner_id, j.attempts, a.storage_key, a.mime_type
  from public.karaoke_v2_jobs j join public.karaoke_v2_assets a on a.project_id = j.project_id and a.kind = 'source'
  where j.id = claimed_id order by a.created_at desc limit 1;
end;
$$;

create or replace function public.karaoke_v2_update_separation_job(target_job_id uuid, next_status text, next_progress numeric, failure_message text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare target_project_id uuid;
begin
  if next_status not in ('running', 'failed') or next_progress < 0 or next_progress > 1 then raise exception 'Invalid worker update'; end if;
  update public.karaoke_v2_jobs set status = next_status, progress = next_progress, error = failure_message,
    lease_expires_at = case when next_status = 'running' then now() + interval '60 minutes' else null end, updated_at = now()
  where id = target_job_id and kind = 'prepare' returning project_id into target_project_id;
  if target_project_id is null then raise exception 'Job not found'; end if;
  if next_status = 'failed' then update public.karaoke_v2_projects set status = 'failed', updated_at = now() where id = target_project_id; end if;
end;
$$;

create or replace function public.karaoke_v2_complete_separation_job(target_job_id uuid, stems_bucket text, instrumental_size bigint, vocals_size bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare target_project_id uuid; target_owner_id uuid; base_path text;
begin
  select project_id, owner_id into target_project_id, target_owner_id from public.karaoke_v2_jobs
  where id = target_job_id and kind = 'prepare' and status = 'running' for update;
  if target_project_id is null then raise exception 'Running job not found'; end if;
  if stems_bucket <> 'karaoke-v2-stems' or instrumental_size <= 0 or vocals_size <= 0 then raise exception 'Invalid outputs'; end if;
  base_path := target_owner_id::text || '/' || target_project_id::text || '/stems/';
  insert into public.karaoke_v2_assets(project_id, owner_id, kind, bucket, storage_key, mime_type, size_bytes)
  values (target_project_id, target_owner_id, 'instrumental', stems_bucket, base_path || 'instrumental.wav', 'audio/wav', instrumental_size),
         (target_project_id, target_owner_id, 'vocals', stems_bucket, base_path || 'vocals.wav', 'audio/wav', vocals_size)
  on conflict (bucket, storage_key) do update set size_bytes = excluded.size_bytes, created_at = now();
  update public.karaoke_v2_jobs set status = 'succeeded', progress = 1, lease_expires_at = null, updated_at = now() where id = target_job_id;
  update public.karaoke_v2_projects set status = 'ready', updated_at = now() where id = target_project_id;
end;
$$;

revoke all on function public.karaoke_v2_claim_separation_job() from public, anon, authenticated;
revoke all on function public.karaoke_v2_update_separation_job(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.karaoke_v2_complete_separation_job(uuid, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.karaoke_v2_claim_separation_job() to service_role;
grant execute on function public.karaoke_v2_update_separation_job(uuid, text, numeric, text) to service_role;
grant execute on function public.karaoke_v2_complete_separation_job(uuid, text, bigint, bigint) to service_role;
