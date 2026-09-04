import { NextResponse } from "next/server";
import { isAuthorizedWorker, KARAOKE_SOURCE_BUCKET, KARAOKE_STEMS_BUCKET, supabaseService } from "@/lib/karaoke-v2/supabase";

type ClaimedJob = {
  job_id: string;
  project_id: string;
  owner_id: string;
  attempts: number;
  source_storage_key: string;
  source_mime_type: string;
};

export async function POST(request: Request) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const client = supabaseService();
  const { error: retryError } = await client
    .from("karaoke_v2_jobs")
    .update({ status: "queued", progress: null, error: null, lease_expires_at: null })
    .eq("kind", "prepare")
    .eq("status", "failed")
    .lt("attempts", 7);
  if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
  const { data, error } = await client.rpc("karaoke_v2_claim_separation_job").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return new NextResponse(null, { status: 204 });
  const job = data as ClaimedJob;

  const { data: source, error: sourceError } = await client.storage
    .from(KARAOKE_SOURCE_BUCKET)
    .createSignedUrl(job.source_storage_key, 3600);
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

  const base = `${job.owner_id}/${job.project_id}/stems`;
  const instrumentalPath = `${base}/instrumental.mp3`;
  const vocalsPath = `${base}/vocals.mp3`;
  const [instrumental, vocals] = await Promise.all([
    client.storage.from(KARAOKE_STEMS_BUCKET).createSignedUploadUrl(instrumentalPath),
    client.storage.from(KARAOKE_STEMS_BUCKET).createSignedUploadUrl(vocalsPath),
  ]);
  if (instrumental.error || vocals.error) {
    return NextResponse.json({ error: instrumental.error?.message || vocals.error?.message }, { status: 500 });
  }

  return NextResponse.json({
    job: { id: job.job_id, projectId: job.project_id, attempt: job.attempts },
    source: { url: source.signedUrl, mimeType: job.source_mime_type },
    outputs: {
      instrumental: { bucket: KARAOKE_STEMS_BUCKET, ...instrumental.data },
      vocals: { bucket: KARAOKE_STEMS_BUCKET, ...vocals.data },
    },
  });
}
