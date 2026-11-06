import { NextResponse } from "next/server";
import { isAuthorizedWorker, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const service = supabaseService();
  const { data: job, error: jobError } = await service.from("karaoke_v2_jobs")
    .select("project_id,owner_id,kind,status")
    .eq("id", id).eq("kind", "transcribe").eq("status", "succeeded").maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Completed transcription job not found." }, { status: 404 });

  const { data: revisions, error: revisionError } = await service.from("karaoke_v2_project_revisions")
    .select("revision,project_data,created_at")
    .eq("project_id", job.project_id).order("revision", { ascending: false }).limit(2);
  if (revisionError) return NextResponse.json({ error: revisionError.message }, { status: 500 });
  if (!revisions || revisions.length < 2) return NextResponse.json({ error: "The previous lyric revision is unavailable." }, { status: 409 });

  const [latest, previous] = revisions;
  const now = new Date().toISOString();
  const restoredRevision = latest.revision + 1;
  const priorData = previous.project_data as Record<string, unknown>;
  const restoredData = { ...priorData, status: "ready", updatedAt: now, revision: restoredRevision };
  const { error: insertError } = await service.from("karaoke_v2_project_revisions").insert({
    project_id: job.project_id,
    owner_id: job.owner_id,
    revision: restoredRevision,
    project_data: restoredData,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await service.from("karaoke_v2_projects").update({ status: "ready", updated_at: now }).eq("id", job.project_id);
  return NextResponse.json({ restored: true, revision: restoredRevision, restoredFrom: previous.revision });
}
