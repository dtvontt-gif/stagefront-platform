import { karaokeSession } from "@/lib/karaoke-v2/auth";
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
    return new Response(result.audio, {
      headers: {
        "content-type": result.contentType,
        "content-disposition": 'inline; filename="stagefront-generation.mp3"',
        "cache-control": "no-store",
        ...(result.generationId ? { "x-stagefront-generation-id": result.generationId } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Music generation failed.";
    console.error("music-generation", message);
    const notConfigured = message.includes("not configured");
    return Response.json({ error: message }, { status: notConfigured ? 503 : 502 });
  }
}
