import RunwayML, { APIError } from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/stagefront-auth";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/video/download/[id]">,
) {
  if (!await authenticatedUser()) {
    return NextResponse.json({ error: "Sign in to download this video." }, { status: 401 });
  }
  const apiKey = process.env.RUNWAYML_API_SECRET?.trim();
  if (!apiKey) return NextResponse.json({ error: "Video downloads are unavailable." }, { status: 503 });

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid video reference." }, { status: 400 });
    }
    const task = await new RunwayML({ apiKey }).tasks.retrieve(id);
    if (task.status !== "SUCCEEDED" || !task.output[0]) {
      return NextResponse.json({ error: "This video is not ready to download." }, { status: 409 });
    }
    const source = await fetch(task.output[0], { cache: "no-store" });
    if (!source.ok || !source.body) {
      return NextResponse.json({ error: "The finished video could not be downloaded." }, { status: 502 });
    }
    return new Response(source.body, {
      headers: {
        "Content-Type": source.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `attachment; filename="stagefront-ai-video-${id.slice(0, 8)}.mp4"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return NextResponse.json({ error: "This video is no longer available from Runway." }, { status: 404 });
    }
    console.error("Video download failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not download this video." }, { status: 502 });
  }
}
