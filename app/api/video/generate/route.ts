import RunwayML, { APIError } from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/stagefront-auth";
import { consumeVideoCredit, grantVideoCredits, ownerHasFreeVideoAccess } from "@/lib/video-credits";

const MODEL = "gen4.5" as const;
const RATIO = "720:1280" as const;
const MAX_DATA_URI_LENGTH = 3_400_000;
// Keep uploads below Vercel's function request-body ceiling.
const MAX_VIDEO_BYTES = 4_000_000;
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function buildPrompt(idea: string) {
  return idea.slice(0, 1000);
}

function providerError(error: unknown) {
  if (error instanceof APIError) {
    console.error("Runway create task failed", error.status, error.message);
    const status = error.status === 429 ? 429 : error.status && error.status < 500 ? 400 : 502;
    const message =
      error.status === 401
        ? "Runway rejected the API key. Check RUNWAYML_API_SECRET in Vercel."
        : error.status === 429
          ? "Runway is busy or the account has reached a limit. Please try again shortly."
          : error.message || "Runway could not start this generation.";
    return NextResponse.json({ error: message }, { status });
  }
  console.error("Video generation route failed", error);
  return NextResponse.json({ error: "Could not start video generation." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in before generating a video." }, { status: 401 });
  }
  const apiKey = process.env.RUNWAYML_API_SECRET?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Runway is not connected yet. RUNWAYML_API_SECRET is missing." },
      { status: 503 },
    );
  }

  let reservation = "";
  try {
    const isVideoEdit = request.headers
      .get("content-type")
      ?.includes("multipart/form-data");
    const body = isVideoEdit ? await request.formData() : await request.json();
    const idea = String(isVideoEdit ? body.get("idea") : body.idea || "").trim();
    const duration = Number(isVideoEdit ? 5 : body.duration || 5);
    const referenceUrl = String(
      isVideoEdit ? "" : body.referenceUrl || "",
    ).trim();
    const sourceVideo = isVideoEdit ? body.get("video") : null;

    if (!idea) return NextResponse.json({ error: "Describe your video idea first." }, { status: 400 });
    if (idea.length > 1000) {
      return NextResponse.json({ error: "Keep the video idea under 1,000 characters." }, { status: 400 });
    }
    if (!isVideoEdit && (!Number.isInteger(duration) || duration < 2 || duration > 10)) {
      return NextResponse.json({ error: "Duration must be between 2 and 10 seconds." }, { status: 400 });
    }

    if (isVideoEdit) {
      if (!(sourceVideo instanceof File) || !sourceVideo.size) {
        return NextResponse.json({ error: "Choose a video to edit first." }, { status: 400 });
      }
      if (!VIDEO_TYPES.has(sourceVideo.type) || sourceVideo.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: "Choose an MP4, MOV, or WebM video under 4 MB." },
          { status: 400 },
        );
      }
    }

    if (referenceUrl.startsWith("data:")) {
      if (
        referenceUrl.length > MAX_DATA_URI_LENGTH ||
        !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(referenceUrl)
      ) {
        return NextResponse.json({ error: "Upload a valid JPG, PNG, or WebP image under 2.5 MB." }, { status: 400 });
      }
    } else if (referenceUrl) {
      try {
        const parsed = new URL(referenceUrl);
        if (parsed.protocol !== "https:") throw new Error("Not HTTPS");
      } catch {
        return NextResponse.json({ error: "Reference image must be a valid HTTPS URL." }, { status: 400 });
      }
    }

    if (!ownerHasFreeVideoAccess(user.email)) {
      reservation = `generation:${crypto.randomUUID()}`;
      const consumed = await consumeVideoCredit(user.id, reservation);
      if (!consumed) {
        return NextResponse.json({ error: "Purchase a video credit before generating." }, { status: 402 });
      }
    }

    const runway = new RunwayML({ apiKey });
    if (isVideoEdit && sourceVideo instanceof File) {
      const upload = await runway.uploads.createEphemeral({ file: sourceVideo });
      const task = await runway.videoToVideo.create({
        model: "aleph2",
        videoUri: upload.uri,
        promptText: buildPrompt(idea),
        outputFormat: "prores",
        proresProfile: "4444",
      });
      return NextResponse.json({
        id: task.id,
        status: "pending",
        outputFormat: "prores",
        estimatedCredits: task.estimatedCost?.credits ?? null,
      });
    }
    const common = {
      model: MODEL,
      promptText: buildPrompt(idea),
      ratio: RATIO,
      duration,
      outputFormat: "mp4" as const,
    };
    const task = referenceUrl
      ? await runway.imageToVideo.create({ ...common, promptImage: referenceUrl })
      : await runway.textToVideo.create(common);

    return NextResponse.json({
      id: task.id,
      status: "pending",
      outputFormat: "mp4",
      estimatedCredits: task.estimatedCost?.credits ?? null,
    });
  } catch (error) {
    if (reservation) {
      try {
        await grantVideoCredits(user.id, 1, "generation_refund", `refund:${reservation}`, {
          reason: error instanceof Error ? error.message : "generation_start_failed",
        });
      } catch (refundError) {
        console.error("Video credit refund failed", refundError);
      }
    }
    return providerError(error);
  }
}
