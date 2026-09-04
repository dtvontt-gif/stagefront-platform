import { NextResponse } from "next/server";
import { isAuthorizedWorker, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "failed" ? "failed" : "running";
  const progress = Math.max(0, Math.min(1, Number(body.progress) || 0));
  const { error } = await supabaseService().rpc("karaoke_v2_update_render_job", {
    target_job_id: id, next_status: status, next_progress: progress, failure_message: status === "failed" ? String(body.error || "Video render failed.").slice(0, 2000) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
