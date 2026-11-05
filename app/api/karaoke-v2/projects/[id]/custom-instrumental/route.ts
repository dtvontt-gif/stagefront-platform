import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_STEMS_BUCKET, supabaseForUser, supabaseService } from "@/lib/karaoke-v2/supabase";
import { wakeKaraokeWorker } from "@/lib/karaoke-v2/worker-trigger";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabaseForUser(session.accessToken).from("karaoke_v2_assets")
    .select("original_file_name,size_bytes,created_at,storage_key")
    .eq("project_id", id).eq("kind", "instrumental").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const isCustom = Boolean(data?.original_file_name);
  return NextResponse.json({
    instrumental: isCustom ? { fileName: data!.original_file_name, sizeBytes: data!.size_bytes, uploadedAt: data!.created_at } : null,
    using: isCustom ? "custom" : data ? "separated" : "missing",
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const client = supabaseForUser(session.accessToken);
  const [{ data: project }, { data: custom }, { data: source }, { data: active }] = await Promise.all([
    client.from("karaoke_v2_projects").select("id").eq("id", id).maybeSingle(),
    client.from("karaoke_v2_assets").select("id,storage_key,original_file_name").eq("project_id", id).eq("kind", "instrumental").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("karaoke_v2_assets").select("id").eq("project_id", id).eq("kind", "source").limit(1).maybeSingle(),
    client.from("karaoke_v2_jobs").select("id,status").eq("project_id", id).eq("kind", "prepare").in("status", ["queued", "running"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!custom?.original_file_name) return NextResponse.json({ error: "This song is already using the separated instrumental." }, { status: 409 });
  if (!source) return NextResponse.json({ error: "The original song file is missing, so the separated instrumental cannot be rebuilt." }, { status: 409 });
  if (active) return NextResponse.json({ ok: true, status: active.status, alreadyQueued: true });

  const service = supabaseService();
  const { error: removeObjectError } = await service.storage.from(KARAOKE_STEMS_BUCKET).remove([custom.storage_key]);
  if (removeObjectError) return NextResponse.json({ error: removeObjectError.message }, { status: 500 });
  const { error: removeAssetError } = await service.from("karaoke_v2_assets").delete().eq("id", custom.id);
  if (removeAssetError) return NextResponse.json({ error: removeAssetError.message }, { status: 500 });

  const { data: job, error: jobError } = await service.from("karaoke_v2_jobs").insert({
    project_id: id,
    owner_id: session.user.id,
    kind: "prepare",
    status: "queued",
    progress: 0,
  }).select("id,status").single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message || "Could not rebuild the separated instrumental." }, { status: 500 });
  await service.from("karaoke_v2_projects").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", id);
  const workerStarted = await wakeKaraokeWorker();
  return NextResponse.json({ ok: true, status: "queued", job, workerStarted });
}
