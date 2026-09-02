insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('karaoke-v2-renders', 'karaoke-v2-renders', false, 1073741824, array['video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "karaoke v2 owners read renders" on storage.objects for select to authenticated
  using (bucket_id = 'karaoke-v2-renders' and (storage.foldername(name))[1] = auth.uid()::text);

create index if not exists karaoke_v2_render_jobs_claim_idx
  on public.karaoke_v2_jobs(status, created_at) where kind = 'render';

create or replace function public.karaoke_v2_claim_render_job()
returns table(job_id uuid, project_id uuid, owner_id uuid, attempts integer, instrumental_bucket text,
  instrumental_storage_key text, project_data jsonb)
language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  select j.id into claimed_id from public.karaoke_v2_jobs j
  where j.kind = 'render' and (j.status = 'queued' or (j.status = 'running' and j.lease_expires_at < now()))
  order by j.created_at for update skip locked limit 1;
  if claimed_id is null then return; end if;
  update public.karaoke_v2_jobs j set status = 'running', progress = 0.02, attempts = j.attempts + 1,
    lease_expires_at = now() + interval '60 minutes', error = null, updated_at = now() where j.id = claimed_id;
  return query select j.id, j.project_id, j.owner_id, j.attempts, a.bucket, a.storage_key, r.project_data
  from public.karaoke_v2_jobs j
  join public.karaoke_v2_assets a on a.project_id = j.project_id and a.kind = 'instrumental'
  join lateral (select pr.project_data from public.karaoke_v2_project_revisions pr
    where pr.project_id = j.project_id order by pr.revision desc limit 1) r on true
  where j.id = claimed_id order by a.created_at desc limit 1;
end;
$$;

create or replace function public.karaoke_v2_update_render_job(target_job_id uuid, next_status text, next_progress numeric, failure_message text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if next_status not in ('running', 'failed') or next_progress < 0 or next_progress > 1 then raise exception 'Invalid worker update'; end if;
  update public.karaoke_v2_jobs set status = next_status, progress = next_progress, error = failure_message,
    lease_expires_at = case when next_status = 'running' then now() + interval '60 minutes' else null end, updated_at = now()
  where id = target_job_id and kind = 'render';
  if not found then raise exception 'Render job not found'; end if;
end;
$$;

create or replace function public.karaoke_v2_complete_render_job(target_job_id uuid, renders_bucket text, render_size bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare target_project_id uuid; target_owner_id uuid; render_path text;
begin
  select project_id, owner_id into target_project_id, target_owner_id from public.karaoke_v2_jobs
  where id = target_job_id and kind = 'render' and status = 'running' for update;
  if target_project_id is null then raise exception 'Running render job not found'; end if;
  if renders_bucket <> 'karaoke-v2-renders' or render_size <= 0 then raise exception 'Invalid render output'; end if;
  render_path := target_owner_id::text || '/' || target_project_id::text || '/renders/karaoke.mp4';
  insert into public.karaoke_v2_assets(project_id, owner_id, kind, bucket, storage_key, mime_type, size_bytes)
  values (target_project_id, target_owner_id, 'render', renders_bucket, render_path, 'video/mp4', render_size)
  on conflict (bucket, storage_key) do update set size_bytes = excluded.size_bytes, mime_type = excluded.mime_type, created_at = now();
  update public.karaoke_v2_jobs set status = 'succeeded', progress = 1, lease_expires_at = null, updated_at = now()
  where id = target_job_id;
end;
$$;

revoke all on function public.karaoke_v2_claim_render_job() from public, anon, authenticated;
revoke all on function public.karaoke_v2_update_render_job(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.karaoke_v2_complete_render_job(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.karaoke_v2_claim_render_job() to service_role;
grant execute on function public.karaoke_v2_update_render_job(uuid, text, numeric, text) to service_role;
grant execute on function public.karaoke_v2_complete_render_job(uuid, text, bigint) to service_role;
