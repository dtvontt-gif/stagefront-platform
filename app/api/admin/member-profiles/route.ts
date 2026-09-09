import { profileImageUrl } from "@/lib/profile-images";
import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

export async function GET() {
  const access = await requirePermission("profiles");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Profile manager access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });

  const query = new URLSearchParams({
    select: "user_id,email,username,display_name,role,is_public,profile_image_path,created_at",
    order: "created_at.desc",
    limit: "1000",
  });
  const response = await fetch(`${config.url}/rest/v1/stagefront_profiles?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ message: "Unable to load account profiles." }, { status: 502 });
  const rows = (await response.json()) as Record<string, unknown>[];
  return Response.json({
    profiles: rows.map((profile) => ({
      ...profile,
      profile_image_url: profileImageUrl(config.url, profile.profile_image_path as string | null),
    })),
  });
}
