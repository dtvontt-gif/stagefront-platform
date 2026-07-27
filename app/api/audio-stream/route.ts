import { serviceConfiguration } from "@/lib/stagefront-auth";

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ station: null });
  const response = await fetch(
    `${config.url}/rest/v1/stagefront_audio_station?id=eq.1&select=station_name,show_title,stream_url,tiktok_live_url,is_live,updated_at`,
    {
      headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return Response.json({ station: null });
  const [station] = (await response.json()) as unknown[];
  return Response.json({ station: station ?? null });
}
