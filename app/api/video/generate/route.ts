import RunwayML, { APIError } from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/stagefront-auth";
import { consumeVideoCredit, grantVideoCredits, ownerHasFreeVideoAccess } from "@/lib/video-credits";

const MODEL = "gen4.5" as const;
const RATIO = "720:1280" as const;
const MAX_DATA_URI_LENGTH = 3_400_000;

function buildPrompt(idea: string) {
  const direction =
    "Create a polished cinematic vertical social video. Keep the subject visually consistent, use natural motion, cinematic lighting, realistic physics, a strong opening frame, and a clean hero ending. Do not add captions, logos, watermarks, or on-screen text unless explicitly requested.\n\nIdea: ";
  return `${direction}${idea}`.slice(0, 1000);
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
    const body = await request.json();
    const idea = String(body.idea || "").trim();
    const duration = Number(body.duration || 5);
    const referenceUrl = String(body.referenceUrl || "").trim();

    if (!idea) return NextResponse.json({ error: "Describe your video idea first." }, { status: 400 });
    if (idea.length > 800) {
      return NextResponse.json({ error: "Keep the video idea under 800 characters." }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 2 || duration > 10) {
      return NextResponse.json({ error: "Duration must be between 2 and 10 seconds." }, { status: 400 });
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
