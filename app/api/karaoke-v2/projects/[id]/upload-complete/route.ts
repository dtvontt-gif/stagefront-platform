import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_SOURCE_BUCKET, supabaseForUser } from "@/lib/karaoke-v2/supabase";
import { wakeKaraokeWorker } from "@/lib/karaoke-v2/worker-trigger";

export async function POST(request: Request, context: RouteContext<"/api/karaoke-v2/projects/[id]/upload-complete">) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const path = String(body.path || "");
  const fileName = String(body.fileName || "").slice(0, 255);
  const mimeType = String(body.mimeType || "").slice(0, 120);
  const sizeBytes = Number(body.size || 0);
  const prefix = `${session.user.id}/${id}/source/`;
  if (!path.startsWith(prefix) || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1) {
    return NextResponse.json({ error: "Invalid uploaded asset." }, { status: 400 });
  }

  const client = supabaseForUser(session.accessToken);
  const objectName = path.slice(prefix.length);
  const { data: objects, error: listError } = await client.storage.from(KARAOKE_SOURCE_BUCKET).list(prefix.slice(0, -1), {
    search: objectName,
    limit: 10,
  });
  if (listError || !objects?.some((item) => item.name === objectName)) {
    return NextResponse.json({ error: "Upload could not be verified." }, { status: 400 });
  }

  const { error } = await client.rpc("karaoke_v2_complete_upload", {
    target_project_id: id,
    object_path: path,
    original_file_name: fileName,
    media_type: mimeType,
    object_size: sizeBytes,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const workerStarted = await wakeKaraokeWorker();
  return NextResponse.json({ ok: true, status: "queued", workerStarted });
}
