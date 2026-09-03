import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseService } from "@/lib/karaoke-v2/supabase";

export async function GET() {
  const session = await karaokeSession();
  if (!session) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const client = supabaseService();
  const { data, error } = await client
    .from("music_generations")
    .select("id,prompt,required_words,duration_seconds,provider,provider_generation_id,bucket,storage_key,mime_type,size_bytes,created_at")
    .eq("owner_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const generations = await Promise.all((data || []).map(async (generation) => {
    const { data: signed } = await client.storage.from(generation.bucket).createSignedUrl(generation.storage_key, 60 * 60);
    return { ...generation, audioUrl: signed?.signedUrl || null };
  }));
  return Response.json({ generations });
}
