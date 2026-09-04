import { NextResponse } from "next/server";
import { isAuthorizedWorker, KARAOKE_RENDERS_BUCKET, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const renderSize = Number(body.renderSize);
  const storageKey = String(body.storageKey || "");
  if (!Number.isSafeInteger(renderSize) || renderSize <= 0) return NextResponse.json({ error: "A valid render size is required." }, { status: 400 });
  const service = supabaseService();
  const { data: job, error: jobError } = await service.from("karaoke_v2_jobs").select("project_id,owner_id").eq("id", id).eq("kind", "render").eq("status", "running").maybeSingle();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message || "Running render job not found." }, { status: 404 });
  const expectedKey = `${job.owner_id}/${job.project_id}/renders/karaoke-${id}.mp4`;
  if (storageKey !== expectedKey) return NextResponse.json({ error: "Invalid render output." }, { status: 400 });
  const { data: existing, error: assetError } = await service.from("karaoke_v2_assets").select("id").eq("project_id", job.project_id).eq("kind", "render").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
  const asset = { project_id: job.project_id, owner_id: job.owner_id, kind: "render", bucket: KARAOKE_RENDERS_BUCKET, storage_key: storageKey, original_file_name: "stagefront-karaoke.mp4", mime_type: "video/mp4", size_bytes: renderSize, created_at: new Date().toISOString() };
  const { error: saveError } = existing
    ? await service.from("karaoke_v2_assets").update(asset).eq("id", existing.id)
    : await service.from("karaoke_v2_assets").insert(asset);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  const { error: completeError } = await service.from("karaoke_v2_jobs").update({ status: "succeeded", progress: 1, lease_expires_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "running");
  if (completeError) return NextResponse.json({ error: completeError.message }, { status: 500 });
  return NextResponse.json({ completed: true });
}
