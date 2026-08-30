import { serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ hosts: [] });

  const query = new URLSearchParams({
    select:
      "founder_number,display_name,username,tiktok_profile_url,tiktok_live_url,is_live,profile_image_path",
    role: "eq.host",
    host_published: "eq.true",
    order: "is_live.desc,founder_number.asc",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ hosts: [] });
  const rows = (await response.json()) as Record<string, unknown>[];
  return Response.json({
    hosts: rows.map((row) => ({
      ...row,
      profile_image_url: profileImageUrl(config.url, row.profile_image_path as string | null),
    })),
  });
}
