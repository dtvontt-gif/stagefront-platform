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
      body: JSON.stringify(request.requiredWords ? {
        composition_plan: {
          chunks: [{
            text: `[Sonic Logo]\n{arena drums and low grand piano intro}\n${request.requiredWords}\n{electric guitar resolves cleanly}`,
            duration_ms: Math.round(request.durationSeconds * 1000),
            positive_styles: [
              "premium concert-stage sonic logo",
              "real expressive electric guitar through a physical talk box",
              "the required words are clearly articulated once as the main melodic hook",
              "arena drums",
              "low grand piano",
              "cinematic live-concert energy",
              "polished professional studio mix",
              request.prompt,
            ],
            negative_styles: ["bullhorn", "intercom", "toy", "cheap synthesizer", "spoken announcer", "unclear words", "copyrighted melody"],
            context_adherence: "high",
          }],
        },
        model_id: "music_v2",
        sign_with_c2pa: true,
      } : {
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
