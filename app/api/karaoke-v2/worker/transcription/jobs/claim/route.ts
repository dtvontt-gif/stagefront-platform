import { NextResponse } from "next/server";
import { isAuthorizedWorker, supabaseService } from "@/lib/karaoke-v2/supabase";

type ClaimedTranscription = {
  job_id: string;
  project_id: string;
  attempts: number;
  vocals_bucket: string;
  vocals_storage_key: string;
  vocals_mime_type: string;
};

export async function POST(request: Request) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const client = supabaseService();
  const { error: retryError } = await client.from("karaoke_v2_jobs")
    .update({ status: "queued", progress: null, error: null, lease_expires_at: null })
    .eq("kind", "transcribe").eq("status", "failed").lt("attempts", 3);
  if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });

  const { data, error } = await client.rpc("karaoke_v2_claim_transcription_job").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return new NextResponse(null, { status: 204 });
  const job = data as ClaimedTranscription;
  const { data: audio, error: audioError } = await client.storage.from(job.vocals_bucket)
    .createSignedUrl(job.vocals_storage_key, 3600);
  if (audioError) return NextResponse.json({ error: audioError.message }, { status: 500 });
  return NextResponse.json({
    job: { id: job.job_id, projectId: job.project_id, attempt: job.attempts },
    vocals: { url: audio.signedUrl, mimeType: job.vocals_mime_type },
  });
}
