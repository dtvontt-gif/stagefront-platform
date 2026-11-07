import { NextResponse } from "next/server";
import { isAuthorizedWorker, KARAOKE_STEMS_BUCKET, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const instrumentalSize = Number(body.instrumentalSize);
  const vocalsSize = Number(body.vocalsSize);
  if (!Number.isSafeInteger(instrumentalSize) || instrumentalSize <= 0 || !Number.isSafeInteger(vocalsSize) || vocalsSize <= 0) {
    return NextResponse.json({ error: "Valid output sizes are required." }, { status: 400 });
  }
  const service = supabaseService();
  const { data: separationJob } = await service.from("karaoke_v2_jobs").select("project_id").eq("id", id).maybeSingle();
  const { count: savedRevisionCount } = separationJob
    ? await service.from("karaoke_v2_project_revisions").select("id", { count: "exact", head: true }).eq("project_id", separationJob.project_id)
    : { count: 0 };
  const { error } = await service.rpc("karaoke_v2_complete_separation_job", {
    target_job_id: id,
    stems_bucket: KARAOKE_STEMS_BUCKET,
    instrumental_size: instrumentalSize,
    vocals_size: vocalsSize,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Every project starts with revision 1. Only revisions after that indicate
  // lyrics the user or transcription has already saved and must be preserved.
  if (separationJob && (savedRevisionCount || 0) > 1) {
    await service.from("karaoke_v2_jobs")
      .update({ status: "cancelled", progress: 0, error: "Skipped because saved lyrics already exist.", lease_expires_at: null, updated_at: new Date().toISOString() })
      .eq("project_id", separationJob.project_id).eq("kind", "transcribe").eq("status", "queued");
    await service.from("karaoke_v2_projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", separationJob.project_id);
  }
  return NextResponse.json({ completed: true });
}
