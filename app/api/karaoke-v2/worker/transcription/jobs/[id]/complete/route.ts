import { NextResponse } from "next/server";
import { isAuthorizedWorker, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const lines = Array.isArray(body.lines) ? body.lines : null;
  const language = String(body.language || "unknown").slice(0, 24);
  const durationMs = Number(body.durationMs);
  if (!lines || lines.length > 5000 || !Number.isSafeInteger(durationMs) || durationMs <= 0) {
    return NextResponse.json({ error: "Valid timed lyrics are required." }, { status: 400 });
  }
  const encodedSize = new TextEncoder().encode(JSON.stringify(lines)).byteLength;
  if (encodedSize > 4_000_000) return NextResponse.json({ error: "Timed lyrics are too large." }, { status: 413 });
  const { error } = await supabaseService().rpc("karaoke_v2_complete_transcription_job", {
    target_job_id: id,
    detected_language: language,
    audio_duration_ms: durationMs,
    lyrics_lines: lines,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ completed: true, lineCount: lines.length });
}
