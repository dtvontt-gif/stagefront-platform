import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_BACKGROUNDS_BUCKET, supabaseForUser, supabaseService } from "@/lib/karaoke-v2/supabase";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const mimeType = String(body.mimeType || "").toLowerCase();
  const size = Number(body.size || 0);
  if (!IMAGE_TYPES.has(mimeType) || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image under 15 MB." }, { status: 400 });
  }
  const userClient = supabaseForUser(session.accessToken);
  const { data: project } = await userClient.from("karaoke_v2_projects").select("id").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const service = supabaseService();
  const { error: bucketError } = await service.storage.getBucket(KARAOKE_BACKGROUNDS_BUCKET);
  if (bucketError) {
    const { error: createError } = await service.storage.createBucket(KARAOKE_BACKGROUNDS_BUCKET, {
      public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: [...IMAGE_TYPES],
    });
    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  }
  const path = `${session.user.id}/${id}/background/background.${EXTENSIONS[mimeType]}`;
  const { data, error } = await service.storage.from(KARAOKE_BACKGROUNDS_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bucket: KARAOKE_BACKGROUNDS_BUCKET, path, token: data.token });
}
