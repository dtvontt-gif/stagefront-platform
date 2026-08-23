import { NextResponse } from "next/server";
import { isAuthorizedWorker, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const progress = Number(body.progress);
  const status = body.status === "failed" ? "failed" : "running";
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    return NextResponse.json({ error: "Progress must be between 0 and 1." }, { status: 400 });
  }
  const { error } = await supabaseService().rpc("karaoke_v2_update_separation_job", {
    target_job_id: id,
    next_status: status,
    next_progress: progress,
    failure_message: status === "failed" ? String(body.error || "Separation failed.").slice(0, 2000) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
