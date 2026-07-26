import { serviceConfiguration } from "@/lib/stagefront-auth";

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ hosts: [] });

  const query = new URLSearchParams({
    select:
      "founder_number,display_name,username,tiktok_profile_url,tiktok_live_url,is_live",
    role: "eq.host",
    host_published: "eq.true",
    order: "is_live.desc,founder_number.asc",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  return response.ok
    ? Response.json({ hosts: await response.json() })
    : Response.json({ hosts: [] });
}
