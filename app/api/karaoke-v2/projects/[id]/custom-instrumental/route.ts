import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

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
