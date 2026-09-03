import "server-only";
import type { MusicGenerationRequest, MusicProvider } from "./types";

const API_URL = "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192";

export const elevenMusicProvider: MusicProvider = {
  id: "eleven-music-v2",
  async generate(request: MusicGenerationRequest) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Music generation is not configured yet.");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        music_length_ms: Math.round(request.durationSeconds * 1000),
        model_id: "music_v2",
        force_instrumental: request.instrumental,
        sign_with_c2pa: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Music provider failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    return {
      audio: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      generationId: response.headers.get("song-id") || undefined,
    };
  },
};
