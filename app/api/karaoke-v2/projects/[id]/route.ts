import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_BACKGROUNDS_BUCKET, supabaseForUser, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await context.params;
  const client = supabaseForUser(session.accessToken);
  const { data: project, error: projectError } = await client
    .from("karaoke_v2_projects")
    .select("id,status,owner_id")
    .eq("id", id)
    .single();
  if (projectError || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const service = supabaseService();
  const { data: activeJobs, error: jobsError } = await service
    .from("karaoke_v2_jobs")
    .select("id")
    .eq("project_id", id)
    .in("status", ["queued", "running"])
    .limit(1);
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });
  if (activeJobs?.length) {
    return NextResponse.json({ error: "This song is still processing. Wait for it to finish or fail before deleting it." }, { status: 409 });
  }

  const { data: assets, error: assetsError } = await service
    .from("karaoke_v2_assets")
    .select("bucket,storage_key")
    .eq("project_id", id);
  if (assetsError) return NextResponse.json({ error: assetsError.message }, { status: 500 });

  for (const bucket of new Set((assets || []).map((asset) => asset.bucket))) {
    const paths = (assets || []).filter((asset) => asset.bucket === bucket).map((asset) => asset.storage_key);
    if (paths.length) {
      const { error } = await service.storage.from(bucket).remove(paths);
      if (error) return NextResponse.json({ error: `Could not remove uploaded file: ${error.message}` }, { status: 500 });
    }
  }

  const backgroundFolder = `${project.owner_id}/${id}/background`;
  const { data: backgrounds, error: backgroundListError } = await service.storage
    .from(KARAOKE_BACKGROUNDS_BUCKET)
    .list(backgroundFolder, { limit: 100 });
  if (backgroundListError && !backgroundListError.message.toLowerCase().includes("not found")) {
    return NextResponse.json({ error: `Could not inspect background files: ${backgroundListError.message}` }, { status: 500 });
  }
  const backgroundPaths = (backgrounds || []).filter((item) => item.name).map((item) => `${backgroundFolder}/${item.name}`);
  if (backgroundPaths.length) {
    const { error: backgroundError } = await service.storage.from(KARAOKE_BACKGROUNDS_BUCKET).remove(backgroundPaths);
    if (backgroundError) return NextResponse.json({ error: `Could not remove background file: ${backgroundError.message}` }, { status: 500 });
  }

  const { error } = await service.from("karaoke_v2_projects").delete().eq("id", id).eq("owner_id", session.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
