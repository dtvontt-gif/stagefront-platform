import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

function safeUrl(value: unknown, tiktokOnly = false) {
  if (value === "" || value === null) return null;
  if (typeof value !== "string" || value.length > 700) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    if (tiktokOnly && !/(^|\.)tiktok\.com$/i.test(url.hostname)) return undefined;
    return url.toString();
  } catch { return undefined; }
}

export async function GET() {
  const access = await requirePermission("hosts");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Manager access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Audio station is not configured." }, { status: 503 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_audio_station?id=eq.1&select=*`, {
    headers: headers(config.serviceKey), cache: "no-store",
  });
  const [station] = response.ok ? ((await response.json()) as unknown[]) : [];
  return response.ok ? Response.json({ station: station ?? null }) : Response.json({ message: "Unable to load the audio station." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const access = await requirePermission("hosts");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Manager access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Audio station is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const stationName = typeof body?.stationName === "string" ? body.stationName.trim().slice(0, 80) : "";
  const showTitle = typeof body?.showTitle === "string" ? body.showTitle.trim().slice(0, 120) : "";
  const streamUrl = safeUrl(body?.streamUrl);
  const tiktokUrl = safeUrl(body?.tiktokLiveUrl, true);
  if (!stationName || !showTitle || streamUrl === undefined || tiktokUrl === undefined || typeof body?.isLive !== "boolean") {
    return Response.json({ message: "Enter valid station details. Stream links must begin with https://." }, { status: 400 });
  }
  if (body.isLive && !streamUrl) return Response.json({ message: "Add the Mixxx/Icecast stream URL before going live." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_audio_station?id=eq.1`, {
    method: "PATCH",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      station_name: stationName, show_title: showTitle, stream_url: streamUrl,
      tiktok_live_url: tiktokUrl, is_live: body.isLive, updated_at: new Date().toISOString(),
    }),
  });
  return response.ok
    ? Response.json({ message: body.isLive ? "StageFront Radio is live." : "StageFront Radio is off air." })
    : Response.json({ message: "Audio station settings could not be saved." }, { status: 502 });
}
