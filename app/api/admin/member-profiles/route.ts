import { profileImageUrl } from "@/lib/profile-images";
import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

function validTikTokUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && /(^|\.)tiktok\.com$/i.test(url.hostname) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const access = await requirePermission("profiles");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Profile manager access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });

  const [profilesResponse, foundersResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/stagefront_profiles?${new URLSearchParams({
      select: "user_id,email,username,display_name,role,is_public,profile_image_path,created_at",
      order: "created_at.desc",
      limit: "1000",
    })}`, { headers: headers(config.serviceKey), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/founding_members?${new URLSearchParams({
      select: "email,tiktok_profile_url",
      limit: "1000",
    })}`, { headers: headers(config.serviceKey), cache: "no-store" }),
  ]);
  if (!profilesResponse.ok) return Response.json({ message: "Unable to load account profiles." }, { status: 502 });
  const profiles = (await profilesResponse.json()) as Record<string, unknown>[];
  const founders = foundersResponse.ok ? await foundersResponse.json() as Record<string, unknown>[] : [];
  const tiktokByEmail = new Map(founders.map((founder) => [String(founder.email).toLowerCase(), founder.tiktok_profile_url]));
  return Response.json({
    profiles: profiles.map((profile) => ({
      ...profile,
      tiktok_profile_url: tiktokByEmail.get(String(profile.email).toLowerCase()) ?? null,
      profile_image_url: profileImageUrl(config.url, profile.profile_image_path as string | null),
    })),
  });
}

export async function PATCH(request: Request) {
  const access = await requirePermission("profiles");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Profile manager access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { userId?: unknown; tiktokUrl?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const tiktokUrl = validTikTokUrl(body?.tiktokUrl);
  if (!userId || tiktokUrl === undefined)
    return Response.json({ message: "Paste a complete TikTok profile link beginning with https://." }, { status: 400 });

  const profileQuery = new URLSearchParams({
    select: "email,username,display_name,role",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const profileResponse = await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`, { headers: headers(config.serviceKey), cache: "no-store" });
  const [profile] = profileResponse.ok ? await profileResponse.json() as { email: string; username: string; display_name: string; role: string }[] : [];
  if (!profile) return Response.json({ message: "Account profile not found." }, { status: 404 });

  const founderQuery = new URLSearchParams({ select: "founder_number", email: `eq.${profile.email.toLowerCase()}`, limit: "1" });
  const founderResponse = await fetch(`${config.url}/rest/v1/founding_members?${founderQuery}`, { headers: headers(config.serviceKey), cache: "no-store" });
  const [founder] = founderResponse.ok ? await founderResponse.json() as { founder_number: number }[] : [];
  const role = profile.role === "host" ? "host" : profile.role === "producer" ? "producer" : profile.role === "fan" ? "fan" : "artist";
  const response = founder
    ? await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${founder.founder_number}`, {
        method: "PATCH",
        headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
        body: JSON.stringify({ tiktok_profile_url: tiktokUrl }),
      })
    : await fetch(`${config.url}/rest/v1/founding_members`, {
        method: "POST",
        headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
        body: JSON.stringify({
          display_name: profile.display_name,
          email: profile.email.toLowerCase(),
          username: profile.username,
          role,
          show_on_wall: false,
          tiktok_profile_url: tiktokUrl,
          host_published: role === "host",
        }),
      });
  if (!response.ok) return Response.json({ message: "TikTok link could not be saved. The email or username may already be linked to another original profile." }, { status: 409 });
  return Response.json({ message: tiktokUrl ? "TikTok link saved." : "TikTok link removed." });
}
