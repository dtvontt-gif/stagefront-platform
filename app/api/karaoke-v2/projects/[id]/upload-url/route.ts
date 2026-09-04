import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_SOURCE_BUCKET, supabaseForUser } from "@/lib/karaoke-v2/supabase";

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
]);
const MAX_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request, context: RouteContext<"/api/karaoke-v2/projects/[id]/upload-url">) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const fileName = String(body.fileName || "").trim();
  const mimeType = String(body.mimeType || "").toLowerCase();
  const size = Number(body.size || 0);
  if (!fileName || !AUDIO_TYPES.has(mimeType) || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Choose an MP3, WAV, FLAC, M4A, or MP4 audio file under 250 MB." }, { status: 400 });
  }

  const client = supabaseForUser(session.accessToken);
  const { data: project } = await client.from("karaoke_v2_projects").select("id").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "source-audio";
  const path = `${session.user.id}/${id}/source/${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await client.storage.from(KARAOKE_SOURCE_BUCKET).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bucket: KARAOKE_SOURCE_BUCKET, path, token: data.token });
}
