import { NextRequest, NextResponse } from "next/server";

const TASK_URL =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const apiKey = process.env.BYTEPLUS_MODELARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ModelArk API key is missing." }, { status: 503 });
    }

    const { id } = await context.params;
    if (!/^cgt-[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
    }

    const upstream = await fetch(`${TASK_URL}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Seedance status failed", upstream.status, data);
      return NextResponse.json(
        { error: data?.error?.message || data?.message || "Could not check video status." },
        { status: upstream.status >= 400 && upstream.status < 500 ? 400 : 502 },
      );
    }

    return NextResponse.json({
      id: data.id || id,
      status: data.status || "unknown",
      videoUrl: data?.content?.video_url || null,
      resolution: data.resolution || null,
      ratio: data.ratio || null,
      duration: data.duration || null,
    });
  } catch (error) {
    console.error("Video status route failed", error);
    return NextResponse.json({ error: "Could not check video status." }, { status: 500 });
  }
}
