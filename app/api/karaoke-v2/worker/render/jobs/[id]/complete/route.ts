import { NextResponse } from "next/server";
import { isAuthorizedWorker, KARAOKE_RENDERS_BUCKET, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const renderSize = Number(body.renderSize);
  if (!Number.isSafeInteger(renderSize) || renderSize <= 0) return NextResponse.json({ error: "A valid render size is required." }, { status: 400 });
  const { error } = await supabaseService().rpc("karaoke_v2_complete_render_job", {
    target_job_id: id, renders_bucket: KARAOKE_RENDERS_BUCKET, render_size: renderSize,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ completed: true });
}
