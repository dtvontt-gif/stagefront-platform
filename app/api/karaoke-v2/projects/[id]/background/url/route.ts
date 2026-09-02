import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { KARAOKE_BACKGROUNDS_BUCKET, supabaseForUser, supabaseService } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const client = supabaseForUser(session.accessToken);
  const { data: revision } = await client.from("karaoke_v2_project_revisions").select("project_data").eq("project_id", id).order("revision", { ascending: false }).limit(1).maybeSingle();
  const savedRender = revision?.project_data?.render || {};
  const savedPath = typeof savedRender.backgroundImagePath === "string" ? savedRender.backgroundImagePath : "";
  const expectedPrefix = `${session.user.id}/${id}/background/`;
  const requestedPath = typeof body.path === "string" ? body.path : "";
  let path = requestedPath.startsWith(expectedPrefix) ? requestedPath : savedPath.startsWith(expectedPrefix) ? savedPath : "";
  if (!path) {
    const { data: objects } = await supabaseService().storage.from(KARAOKE_BACKGROUNDS_BUCKET).list(`${session.user.id}/${id}/background`, { search: "background.", limit: 10 });
    const object = objects?.find((item) => item.name.startsWith("background."));
    if (object) path = `${expectedPrefix}${object.name}`;
  }
  if (!path) return NextResponse.json({ error: "Background image not found." }, { status: 404 });
  const { data, error } = await supabaseService().storage.from(KARAOKE_BACKGROUNDS_BUCKET).createSignedUrl(path, 3600);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, path });
}
