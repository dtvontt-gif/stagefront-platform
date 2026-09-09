import { profileImageUrl } from "@/lib/profile-images";
import { serviceConfiguration } from "@/lib/stagefront-auth";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

export async function GET(_request: Request, { params }: RouteContext<"/api/members/[username]">) {
  const config = serviceConfiguration();
  if (!config) return Response.json({ message: "Member service unavailable." }, { status: 503 });
  const { username } = await params;
  const normalizedUsername = username.toLowerCase();

  const accountQuery = new URLSearchParams({
    select: "user_id,username,display_name,bio,role,genres,location,looking_for,profile_image_path",
    username: `eq.${normalizedUsername}`,
    is_public: "eq.true",
    limit: "1",
  });
  const accountResponse = await fetch(`${config.url}/rest/v1/stagefront_profiles?${accountQuery}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  const [accountProfile] = accountResponse.ok
    ? (await accountResponse.json()) as Record<string, unknown>[]
    : [];
  if (accountProfile) {
    return Response.json({
      profile: {
        ...accountProfile,
        legacy_profile: false,
        profile_image_url: profileImageUrl(config.url, accountProfile.profile_image_path as string | null),
      },
    });
  }

  const founderQuery = new URLSearchParams({
    select: "founder_number,username,display_name,bio,role,genres,location,profile_image_path,show_on_wall,host_published",
    username: `eq.${normalizedUsername}`,
    or: "(show_on_wall.eq.true,host_published.eq.true)",
    limit: "1",
  });
  const founderResponse = await fetch(`${config.url}/rest/v1/founding_members?${founderQuery}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  const [founder] = founderResponse.ok
    ? (await founderResponse.json()) as Record<string, unknown>[]
    : [];
  if (!founder) return Response.json({ message: "Member not found." }, { status: 404 });

  return Response.json({
    profile: {
      ...founder,
      user_id: null,
      looking_for: null,
      legacy_profile: true,
      profile_image_url: profileImageUrl(config.url, founder.profile_image_path as string | null),
    },
  });
}
