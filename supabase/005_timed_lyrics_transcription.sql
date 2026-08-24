create or replace function public.karaoke_v2_complete_separation_job(
  target_job_id uuid, stems_bucket text, instrumental_size bigint, vocals_size bigint
)
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
  values (target_project_id, target_owner_id, 'instrumental', stems_bucket, base_path || 'instrumental.mp3', 'audio/mpeg', instrumental_size),
         (target_project_id, target_owner_id, 'vocals', stems_bucket, base_path || 'vocals.mp3', 'audio/mpeg', vocals_size)
  on conflict (bucket, storage_key) do update set size_bytes = excluded.size_bytes, mime_type = excluded.mime_type, created_at = now();
  update public.karaoke_v2_jobs set status = 'succeeded', progress = 1, lease_expires_at = null, updated_at = now() where id = target_job_id;
  insert into public.karaoke_v2_jobs(project_id, owner_id, kind, status)
  values (target_project_id, target_owner_id, 'transcribe', 'queued');
  update public.karaoke_v2_projects set status = 'processing', updated_at = now() where id = target_project_id;
end;
$$;

insert into public.karaoke_v2_jobs(project_id, owner_id, kind, status)
select p.id, p.owner_id, 'transcribe', 'queued'
from public.karaoke_v2_projects p
where exists (select 1 from public.karaoke_v2_assets a where a.project_id = p.id and a.kind = 'vocals')
  and not exists (select 1 from public.karaoke_v2_jobs j where j.project_id = p.id and j.kind = 'transcribe');

update public.karaoke_v2_projects p set status = 'processing', updated_at = now()
where exists (select 1 from public.karaoke_v2_jobs j where j.project_id = p.id and j.kind = 'transcribe' and j.status = 'queued');

create or replace function public.karaoke_v2_claim_transcription_job()
returns table(job_id uuid, project_id uuid, attempts integer, vocals_bucket text, vocals_storage_key text, vocals_mime_type text)
language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  select j.id into claimed_id from public.karaoke_v2_jobs j
  where j.kind = 'transcribe' and (j.status = 'queued' or (j.status = 'running' and j.lease_expires_at < now()))
  order by j.created_at for update skip locked limit 1;
  if claimed_id is null then return; end if;
  update public.karaoke_v2_jobs j set status = 'running', progress = 0.02, attempts = j.attempts + 1,
    lease_expires_at = now() + interval '60 minutes', error = null, updated_at = now() where j.id = claimed_id;
  return query select j.id, j.project_id, j.attempts, a.bucket, a.storage_key, a.mime_type
  from public.karaoke_v2_jobs j join public.karaoke_v2_assets a on a.project_id = j.project_id and a.kind = 'vocals'
  where j.id = claimed_id order by a.created_at desc limit 1;
end;
$$;

create or replace function public.karaoke_v2_update_transcription_job(target_job_id uuid, next_status text, next_progress numeric, failure_message text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare target_project_id uuid;
begin
  if next_status not in ('running', 'failed') or next_progress < 0 or next_progress > 1 then raise exception 'Invalid worker update'; end if;
  update public.karaoke_v2_jobs set status = next_status, progress = next_progress, error = failure_message,
    lease_expires_at = case when next_status = 'running' then now() + interval '60 minutes' else null end, updated_at = now()
  where id = target_job_id and kind = 'transcribe' returning project_id into target_project_id;
  if target_project_id is null then raise exception 'Job not found'; end if;
  if next_status = 'failed' then update public.karaoke_v2_projects set status = 'failed', updated_at = now() where id = target_project_id; end if;
end;
$$;

create or replace function public.karaoke_v2_complete_transcription_job(target_job_id uuid, detected_language text, audio_duration_ms bigint, lyrics_lines jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare target_project_id uuid; target_owner_id uuid; prior_data jsonb; next_revision integer; completed_at timestamptz := now();
begin
  if jsonb_typeof(lyrics_lines) <> 'array' or audio_duration_ms <= 0 then raise exception 'Invalid timed lyrics'; end if;
  select project_id, owner_id into target_project_id, target_owner_id from public.karaoke_v2_jobs
  where id = target_job_id and kind = 'transcribe' and status = 'running' for update;
  if target_project_id is null then raise exception 'Running transcription job not found'; end if;
  select project_data, revision + 1 into prior_data, next_revision from public.karaoke_v2_project_revisions
  where project_id = target_project_id order by revision desc limit 1 for update;
  prior_data := jsonb_set(prior_data, '{lyrics}', jsonb_build_object('offsetMs', 0, 'lines', lyrics_lines), true)
    || jsonb_build_object('status', 'ready', 'updatedAt', completed_at, 'revision', next_revision,
         'language', detected_language, 'durationMs', audio_duration_ms);
  insert into public.karaoke_v2_project_revisions(project_id, owner_id, revision, project_data)
  values (target_project_id, target_owner_id, next_revision, prior_data);
  update public.karaoke_v2_jobs set status = 'succeeded', progress = 1, lease_expires_at = null, updated_at = completed_at where id = target_job_id;
  update public.karaoke_v2_projects set status = 'ready', updated_at = completed_at where id = target_project_id;
end;
$$;

revoke all on function public.karaoke_v2_claim_transcription_job() from public, anon, authenticated;
revoke all on function public.karaoke_v2_update_transcription_job(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.karaoke_v2_complete_transcription_job(uuid, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.karaoke_v2_claim_transcription_job() to service_role;
grant execute on function public.karaoke_v2_update_transcription_job(uuid, text, numeric, text) to service_role;
grant execute on function public.karaoke_v2_complete_transcription_job(uuid, text, bigint, jsonb) to service_role;
