import { NextResponse } from "next/server";
import { karaokeAss, KARAOKE_INTRO_MS, KARAOKE_OUTRO_MS } from "@/lib/karaoke-v2/ass";
import { isAuthorizedWorker, KARAOKE_BACKGROUNDS_BUCKET, KARAOKE_RENDERS_BUCKET, supabaseService } from "@/lib/karaoke-v2/supabase";

type ClaimedRender = { job_id: string; project_id: string; owner_id: string; attempts: number; instrumental_bucket: string; instrumental_storage_key: string; project_data: Parameters<typeof karaokeAss>[0] };

export async function POST(request: Request) {
  if (!isAuthorizedWorker(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const client = supabaseService();
  const { error: retryError } = await client.from("karaoke_v2_jobs").update({ status: "queued", progress: null, error: null, lease_expires_at: null })
    .eq("kind", "render").eq("status", "failed").lt("attempts", 4);
  if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
  const { data, error } = await client.rpc("karaoke_v2_claim_render_job").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return new NextResponse(null, { status: 204 });
  const job = data as ClaimedRender;
  const outputPath = `${job.owner_id}/${job.project_id}/renders/karaoke-${job.job_id}.mp4`;
  const [instrumental, output] = await Promise.all([
    client.storage.from(job.instrumental_bucket).createSignedUrl(job.instrumental_storage_key, 3600),
    client.storage.from(KARAOKE_RENDERS_BUCKET).createSignedUploadUrl(outputPath, { upsert: true }),
  ]);
  if (instrumental.error || output.error) return NextResponse.json({ error: instrumental.error?.message || output.error?.message }, { status: 500 });
  const render = job.project_data.render || {};
  const backgroundPath = typeof render.backgroundImagePath === "string" && render.backgroundImagePath.startsWith(`${job.owner_id}/${job.project_id}/background/`) ? render.backgroundImagePath : "";
  const backgroundImage = backgroundPath ? await client.storage.from(KARAOKE_BACKGROUNDS_BUCKET).createSignedUrl(backgroundPath, 3600) : null;
  if (backgroundImage?.error) return NextResponse.json({ error: backgroundImage.error.message }, { status: 500 });
  const templateImageUrl = render.backgroundTemplate === "stagefront-stage" ? `${new URL(request.url).origin}/images/karaoke/stagefront-stage-background.png` : null;
  const introVideoUrl = `${new URL(request.url).origin}/videos/karaoke/stagefront-intro-visual.mp4`;
  return NextResponse.json({
    job: { id: job.job_id, projectId: job.project_id, attempt: job.attempts },
    instrumental: { url: instrumental.data.signedUrl },
    subtitles: karaokeAss(job.project_data),
    video: { width: render.resolution?.width || 1920, height: render.resolution?.height || 1080, backgroundColor: render.backgroundColor || "#08080b", backgroundImageUrl: templateImageUrl || backgroundImage?.data.signedUrl || null, backgroundImageIsTemplate: Boolean(templateImageUrl), introVideoUrl, introDurationMs: KARAOKE_INTRO_MS, outroDurationMs: KARAOKE_OUTRO_MS },
    output: { bucket: KARAOKE_RENDERS_BUCKET, ...output.data, path: outputPath },
  });
}
