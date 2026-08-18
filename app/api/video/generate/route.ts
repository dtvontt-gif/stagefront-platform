import { NextRequest, NextResponse } from "next/server";

const MODEL_BY_MODE: Record<string, string> = {
  best: process.env.SEEDANCE_MODEL_BEST || "",
  fast: process.env.SEEDANCE_MODEL_FAST || "",
  cheap: process.env.SEEDANCE_MODEL_SAVER || "",
};

function buildPrompt(idea: string) {
  return `Create a polished cinematic social video from this idea: ${idea}\nFormat: vertical 9:16 TikTok short. Keep the subject visually consistent, use natural motion, cinematic lighting, realistic physics, strong opening frame, and a clean hero ending. Do not add captions, logos, watermarks, or on-screen text unless explicitly requested in the idea.`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.BYTEPLUS_MODELARK_API_KEY;
    const endpoint = process.env.SEEDANCE_CREATE_TASK_URL;
    if (!apiKey || !endpoint) {
      return NextResponse.json(
        { error: "Seedance is not connected yet. Add the ModelArk API key and task endpoint in the server environment." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const idea = String(body.idea || "").trim();
    const duration = Number(body.duration || 10);
    const quality = String(body.quality || "best");
    const referenceUrl = String(body.referenceUrl || "").trim();

    if (!idea) return NextResponse.json({ error: "Describe your video idea first." }, { status: 400 });
    if (![5, 10, 15].includes(duration)) return NextResponse.json({ error: "Unsupported duration." }, { status: 400 });

    const model = MODEL_BY_MODE[quality] || MODEL_BY_MODE.best;
    if (!model) return NextResponse.json({ error: `No Seedance model is configured for ${quality} mode.` }, { status: 503 });

    const content: Array<Record<string, unknown>> = [{ type: "text", text: buildPrompt(idea) }];
    if (referenceUrl) content.push({ type: "image_url", image_url: { url: referenceUrl } });

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        content,
        ratio: "9:16",
        duration,
      }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Seedance create task failed", upstream.status, data);
      return NextResponse.json({ error: "The video provider could not start this generation." }, { status: 502 });
    }

    const id = data.id || data.task_id || data.task?.id;
    if (!id) return NextResponse.json({ error: "Video provider returned no task ID." }, { status: 502 });

    return NextResponse.json({ id, status: data.status || "queued" });
  } catch (error) {
    console.error("Video generation route failed", error);
    return NextResponse.json({ error: "Could not start video generation." }, { status: 500 });
  }
}
