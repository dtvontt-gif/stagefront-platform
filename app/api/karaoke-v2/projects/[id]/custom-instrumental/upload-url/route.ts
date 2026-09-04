import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_STEMS_BUCKET, supabaseForUser, supabaseService } from "@/lib/karaoke-v2/supabase";

const AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/x-wav"]);
const MAX_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const fileName = String(body.fileName || "").trim();
  const mimeType = String(body.mimeType || "").toLowerCase();
  const size = Number(body.size || 0);
  if (!fileName || !AUDIO_TYPES.has(mimeType) || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Choose an MP3 or WAV instrumental under 250 MB." }, { status: 400 });
  }

  const client = supabaseForUser(session.accessToken);
  const { data: project } = await client.from("karaoke_v2_projects").select("id").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const path = `${session.user.id}/${id}/stems/instrumental.mp3`;
  const { data, error } = await supabaseService().storage.from(KARAOKE_STEMS_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bucket: KARAOKE_STEMS_BUCKET, path, token: data.token });
}
