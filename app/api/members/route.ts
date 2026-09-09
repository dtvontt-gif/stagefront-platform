import { profileImageUrl } from "@/lib/profile-images";
import { serviceConfiguration } from "@/lib/stagefront-auth";

const serviceHeaders = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
});

export async function GET(request: Request) {
  const config = serviceConfiguration();
  if (!config) return Response.json({ profiles: [] });

  const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const [profilesResponse, foundersResponse] = await Promise.all([
    fetch(
      `${config.url}/rest/v1/stagefront_profiles?${new URLSearchParams({
        select: "user_id,email,username,display_name,bio,role,genres,location,looking_for,profile_image_path,created_at",
        is_public: "eq.true",
        order: "created_at.desc",
        limit: "500",
      })}`,
      { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
    ),
    fetch(
      `${config.url}/rest/v1/founding_members?${new URLSearchParams({
        select: "founder_number,email,username,display_name,bio,role,genres,location,profile_image_path,show_on_wall,host_published,created_at",
        or: "(show_on_wall.eq.true,host_published.eq.true)",
        order: "founder_number.asc",
        limit: "1000",
      })}`,
      { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
    ),
  ]);

  const accountProfiles = profilesResponse.ok
    ? (await profilesResponse.json()) as Record<string, unknown>[]
    : [];
  const founders = foundersResponse.ok
    ? (await foundersResponse.json()) as Record<string, unknown>[]
    : [];
  const claimedEmails = new Set(accountProfiles.map((profile) => String(profile.email).toLowerCase()));
  const claimedUsernames = new Set(accountProfiles.map((profile) => String(profile.username).toLowerCase()));
  const legacyProfiles = founders
    .filter((founder) => {
      const email = String(founder.email).toLowerCase();
      const username = String(founder.username).toLowerCase();
      return !claimedEmails.has(email) && !claimedUsernames.has(username);
    })
    .map((founder) => ({
      ...founder,
      user_id: null,
      profile_key: `founder-${founder.founder_number}`,
      looking_for: null,
      legacy_profile: true,
    }));

  const combinedProfiles: Array<Record<string, unknown> & { profile_key: string; legacy_profile: boolean }> = [
    ...accountProfiles.map((profile) => ({
      ...profile,
      profile_key: String(profile.user_id),
      legacy_profile: false,
    })),
    ...legacyProfiles,
  ];
  const profiles = combinedProfiles
    .filter((profile) => {
      if (!search) return true;
      return [profile.username, profile.display_name, profile.genres]
        .some((value) => String(value ?? "").toLowerCase().includes(search));
    })
    .map((profile) => ({
      ...profile,
      profile_image_url: profileImageUrl(config.url, profile.profile_image_path as string | null),
    }));

  return Response.json({ profiles });
}
