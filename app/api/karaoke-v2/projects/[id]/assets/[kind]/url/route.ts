import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

const ASSET_KINDS = new Set(["vocals", "instrumental", "render"]);

export async function POST(request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id, kind } = await context.params;
  if (!ASSET_KINDS.has(kind)) return NextResponse.json({ error: "Invalid media file." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const download = body.download === true;
  const client = supabaseForUser(session.accessToken);
  const { data: asset, error } = await client
    .from("karaoke_v2_assets")
    .select("bucket,storage_key,mime_type")
    .eq("project_id", id)
    .eq("kind", kind)
    .single();
  if (error || !asset) return NextResponse.json({ error: "Audio track not found." }, { status: 404 });

  const options = download ? { download: kind === "render" ? "stagefront-karaoke.mp4" : `${kind}.mp3` } : undefined;
  const { data, error: signError } = await client.storage.from(asset.bucket).createSignedUrl(asset.storage_key, 900, options);
  if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, mimeType: asset.mime_type, expiresIn: 900 });
}
