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
  const path = String(body.path || "");
  const fileName = String(body.fileName || "").slice(0, 255);
  const mimeType = String(body.mimeType || "").toLowerCase();
  const sizeBytes = Number(body.size || 0);
  const expectedPath = `${session.user.id}/${id}/stems/instrumental.mp3`;
  if (path !== expectedPath || !fileName || !AUDIO_TYPES.has(mimeType) || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "Invalid instrumental upload." }, { status: 400 });
  }

  const userClient = supabaseForUser(session.accessToken);
  const { data: project } = await userClient.from("karaoke_v2_projects").select("id").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const service = supabaseService();
  const { data: objects, error: listError } = await service.storage.from(KARAOKE_STEMS_BUCKET).list(`${session.user.id}/${id}/stems`, {
    search: "instrumental.mp3",
    limit: 10,
  });
  if (listError || !objects?.some((item) => item.name === "instrumental.mp3")) {
    return NextResponse.json({ error: "Instrumental upload could not be verified." }, { status: 400 });
  }

  const { data: existing, error: assetError } = await service.from("karaoke_v2_assets").select("id,storage_key").eq("project_id", id).eq("kind", "instrumental").order("created_at", { ascending: false });
  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
  const asset = {
    project_id: id,
    owner_id: session.user.id,
    kind: "instrumental",
    bucket: KARAOKE_STEMS_BUCKET,
    storage_key: path,
    original_file_name: fileName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    created_at: new Date().toISOString(),
  };
  const primary = existing?.find((item) => item.storage_key === path) || existing?.[0];
  const duplicates = existing?.filter((item) => item.id !== primary?.id) || [];
  if (duplicates.length) {
    const { error: duplicateError } = await service.from("karaoke_v2_assets").delete().in("id", duplicates.map((item) => item.id));
    if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
  }
  const { error: saveError } = primary
    ? await service.from("karaoke_v2_assets").update(asset).eq("id", primary.id)
    : await service.from("karaoke_v2_assets").insert(asset);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
