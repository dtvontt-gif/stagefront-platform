update storage.buckets
set allowed_mime_types = array['audio/wav', 'audio/mpeg']
where id = 'karaoke-v2-stems';

create or replace function public.karaoke_v2_complete_separation_job(
  target_job_id uuid,
  stems_bucket text,
  instrumental_size bigint,
  vocals_size bigint
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
  update public.karaoke_v2_projects set status = 'ready', updated_at = now() where id = target_project_id;
end;
$$;

revoke all on function public.karaoke_v2_complete_separation_job(uuid, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.karaoke_v2_complete_separation_job(uuid, text, bigint, bigint) to service_role;
