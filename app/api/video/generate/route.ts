import { NextRequest, NextResponse } from "next/server";

const CREATE_TASK_URL =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
const MODEL = "seedance-1-0-pro-250528";

function buildPrompt(idea: string, duration: number) {
  return `Create a polished cinematic vertical social video from this idea: ${idea}\nKeep the subject visually consistent, use natural motion, cinematic lighting, realistic physics, a strong opening frame, and a clean hero ending. Do not add captions, logos, watermarks, or on-screen text unless explicitly requested. --resolution 720p --duration ${duration} --camerafixed false`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.BYTEPLUS_MODELARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Seedance is not connected yet. The ModelArk API key is missing." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const idea = String(body.idea || "").trim();
    const duration = Number(body.duration || 5);
    const referenceUrl = String(body.referenceUrl || "").trim();

    if (!idea) {
      return NextResponse.json({ error: "Describe your video idea first." }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 2 || duration > 12) {
      return NextResponse.json({ error: "Duration must be between 2 and 12 seconds." }, { status: 400 });
    }

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: buildPrompt(idea, duration) },
    ];

    if (referenceUrl) {
      let parsed: URL;
      try {
        parsed = new URL(referenceUrl);
      } catch {
        return NextResponse.json({ error: "Reference image must be a valid HTTPS URL." }, { status: 400 });
      }
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "Reference image must use HTTPS." }, { status: 400 });
      }
      content.push({ type: "image_url", image_url: { url: referenceUrl } });
    }

    const upstream = await fetch(CREATE_TASK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, content }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Seedance create task failed", upstream.status, data);
      const message = data?.error?.message || data?.message || "The video provider could not start this generation.";
      return NextResponse.json({ error: message }, { status: upstream.status >= 400 && upstream.status < 500 ? 400 : 502 });
    }

    const id = data.id || data.task_id || data.task?.id;
    if (!id) {
      return NextResponse.json({ error: "Video provider returned no task ID." }, { status: 502 });
    }

    return NextResponse.json({ id, status: data.status || "queued" });
  } catch (error) {
    console.error("Video generation route failed", error);
    return NextResponse.json({ error: "Could not start video generation." }, { status: 500 });
  }
}
