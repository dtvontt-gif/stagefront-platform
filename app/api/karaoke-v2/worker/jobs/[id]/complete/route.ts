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
  const { error } = await supabaseService().rpc("karaoke_v2_complete_separation_job", {
    target_job_id: id,
    stems_bucket: KARAOKE_STEMS_BUCKET,
    instrumental_size: instrumentalSize,
    vocals_size: vocalsSize,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ completed: true });
}
