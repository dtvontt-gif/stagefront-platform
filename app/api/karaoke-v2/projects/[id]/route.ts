import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await context.params;
  const client = supabaseForUser(session.accessToken);
  const { data: project, error: projectError } = await client
    .from("karaoke_v2_projects")
    .select("id,status")
    .eq("id", id)
    .single();
  if (projectError || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!['draft', 'uploading', 'failed'].includes(project.status)) {
    return NextResponse.json({ error: "Only incomplete or failed projects can be deleted here." }, { status: 409 });
  }

  const { data: assets, error: assetsError } = await client
    .from("karaoke_v2_assets")
    .select("bucket,storage_key")
    .eq("project_id", id);
  if (assetsError) return NextResponse.json({ error: assetsError.message }, { status: 500 });

  for (const bucket of new Set((assets || []).map((asset) => asset.bucket))) {
    const paths = (assets || []).filter((asset) => asset.bucket === bucket).map((asset) => asset.storage_key);
    if (paths.length) {
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) return NextResponse.json({ error: `Could not remove uploaded file: ${error.message}` }, { status: 500 });
    }
  }

  const { error } = await client.from("karaoke_v2_projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
