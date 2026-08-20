import RunwayML, { APIError } from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";

const STATUS = {
  PENDING: "pending",
  THROTTLED: "pending",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/video/status/[id]">,
) {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return NextResponse.json({ error: "RUNWAYML_API_SECRET is missing." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid Runway task ID." }, { status: 400 });
    }

    const task = await new RunwayML({ apiKey }).tasks.retrieve(id);
    const succeeded = task.status === "SUCCEEDED";
    const failed = task.status === "FAILED";

    return NextResponse.json({
      id: task.id,
      status: STATUS[task.status],
      videoUrl: succeeded ? task.output[0] ?? null : null,
      progress: task.status === "RUNNING" ? task.progress : null,
      error: failed ? task.failure : null,
    });
  } catch (error) {
    if (error instanceof APIError) {
      console.error("Runway status failed", error.status, error.message);
      const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
      return NextResponse.json(
        { error: error.status === 404 ? "Runway task not found." : "Could not check Runway video status." },
        { status },
      );
    }
    console.error("Video status route failed", error);
    return NextResponse.json({ error: "Could not check video status." }, { status: 500 });
  }
}
