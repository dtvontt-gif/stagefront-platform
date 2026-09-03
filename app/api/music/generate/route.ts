import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseService } from "@/lib/karaoke-v2/supabase";
import { elevenMusicProvider } from "@/lib/music-generation/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await karaokeSession();
  if (!session) return Response.json({ error: "Please sign in again." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as { prompt?: unknown; durationSeconds?: unknown; instrumental?: unknown; requiredWords?: unknown };
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const durationSeconds = Number(input.durationSeconds);
  if (prompt.length < 12 || prompt.length > 4100) {
    return Response.json({ error: "Describe the music in at least 12 characters." }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 3 || durationSeconds > 60) {
    return Response.json({ error: "Choose a duration between 3 and 60 seconds." }, { status: 400 });
  }

  try {
    const result = await elevenMusicProvider.generate({
      prompt,
      durationSeconds,
      instrumental: input.instrumental !== false,
      requiredWords: typeof input.requiredWords === "string" ? input.requiredWords.trim().slice(0, 120) : undefined,
    });
    const generationId = crypto.randomUUID();
    const storageKey = `${session.user.id}/${generationId}.mp3`;
    const service = supabaseService();
    const { error: uploadError } = await service.storage
      .from("music-generations")
      .upload(storageKey, result.audio, { contentType: result.contentType, upsert: false });
    if (uploadError) throw new Error(`Music was created but history storage failed: ${uploadError.message}`);
    const { error: historyError } = await service.from("music_generations").insert({
      id: generationId,
      owner_id: session.user.id,
      prompt,
      required_words: typeof input.requiredWords === "string" ? input.requiredWords.trim().slice(0, 120) || null : null,
      duration_seconds: Math.round(durationSeconds),
      provider: elevenMusicProvider.id,
      provider_generation_id: result.generationId || null,
      bucket: "music-generations",
      storage_key: storageKey,
      mime_type: result.contentType,
      size_bytes: result.audio.byteLength,
    });
    if (historyError) {
      await service.storage.from("music-generations").remove([storageKey]);
      throw new Error(`Music was created but history could not be recorded: ${historyError.message}`);
    }
    return new Response(result.audio, {
      headers: {
        "content-type": result.contentType,
        "content-disposition": 'inline; filename="stagefront-generation.mp3"',
        "cache-control": "no-store",
        "x-stagefront-history-id": generationId,
        ...(result.generationId ? { "x-provider-generation-id": result.generationId } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Music generation failed.";
    console.error("music-generation", message);
    const notConfigured = message.includes("not configured");
    return Response.json({ error: message }, { status: notConfigured ? 503 : 502 });
  }
}
