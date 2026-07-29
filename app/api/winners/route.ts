import { serviceConfiguration } from "@/lib/stagefront-auth";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ winners: [] });

  const query = new URLSearchParams({
    select: "id,display_name,competition,title,season_label,bio,photo_url,video_url,social_url,featured,won_at",
    published: "eq.true",
    order: "featured.desc,display_order.asc,won_at.desc.nullslast,created_at.desc",
  });
  const response = await fetch(`${config.url}/rest/v1/stagefront_winners?${query}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  return response.ok
    ? Response.json({ winners: await response.json() })
    : Response.json({ winners: [] });
}

