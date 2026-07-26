import { authenticatedUser, requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";
import { deleteProfileImage, profileImageUrl, uploadProfileImage, validateProfileImage } from "@/lib/profile-images";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

async function memberForEmail(url: string, key: string, email: string) {
  const query = new URLSearchParams({
    select: "founder_number,display_name,email,username,role,show_on_wall,profile_image_path,bio,location,genres,tiktok_profile_url,instagram_url,youtube_url,facebook_url,website_url",
    email: `eq.${email.toLowerCase()}`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/founding_members?${query}`, { headers: headers(key), cache: "no-store" });
  if (!response.ok) return null;
  const [member] = (await response.json()) as Record<string, unknown>[];
  return member ?? null;
}

async function memberForNumber(url: string, key: string, founderNumber: number) {
  const query = new URLSearchParams({
    select: "founder_number,display_name,email,username,role,show_on_wall,profile_image_path,bio,location,genres,tiktok_profile_url,instagram_url,youtube_url,facebook_url,website_url",
    founder_number: `eq.${founderNumber}`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/founding_members?${query}`, { headers: headers(key), cache: "no-store" });
  if (!response.ok) return null;
  const [member] = (await response.json()) as Record<string, unknown>[];
  return member ?? null;
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  const config = serviceConfiguration();
  if (!user?.email) return Response.json({ message: "Sign in to manage your profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const requestedNumber = Number(new URL(request.url).searchParams.get("member"));
  const canManage = requestedNumber > 0 ? await requirePermission("profiles") : null;
  const member =
    canManage && Number.isSafeInteger(requestedNumber) && requestedNumber > 0
      ? await memberForNumber(config.url, config.serviceKey, requestedNumber)
      : await memberForEmail(config.url, config.serviceKey, user.email);
  if (!member) return Response.json({ message: "No Founding Member registration matches this email. Join first, then return here." }, { status: 404 });
  return Response.json({ member: { ...member, profile_image_url: profileImageUrl(config.url, member.profile_image_path as string | null) } });
}

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  const config = serviceConfiguration();
  if (!user?.email) return Response.json({ message: "Sign in to edit your profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ message: "Invalid profile update." }, { status: 400 });
  const profileForm = form;
  const requestedNumber = Number(form.get("founderNumber"));
  const canManage = requestedNumber > 0 ? await requirePermission("profiles") : null;
  const member =
    canManage && Number.isSafeInteger(requestedNumber) && requestedNumber > 0
      ? await memberForNumber(config.url, config.serviceKey, requestedNumber)
      : await memberForEmail(config.url, config.serviceKey, user.email);
  if (!member) return Response.json({ message: "No matching Founding Member was found." }, { status: 404 });
  const entry = form.get("profilePhoto");
  const file = entry instanceof File && entry.size ? entry : null;
  const removePhoto = form.get("removePhoto") === "true";
  const imageError = validateProfileImage(file);
  if (imageError) return Response.json({ message: imageError }, { status: 400 });
  const displayName = String(form.get("displayName") ?? member.display_name).trim();
  const username = String(form.get("username") ?? member.username).trim().replace(/^@/, "").toLowerCase();
  const role = String(form.get("role") ?? member.role).toLowerCase();
  const showOnWall = form.get("showOnWall") === "on";
  const bio = String(form.get("bio") ?? "").trim().slice(0, 600);
  const location = String(form.get("location") ?? "").trim().slice(0, 100);
  const genres = String(form.get("genres") ?? "").trim().slice(0, 180);
  function safeUrl(name: string) {
    const value = String(profileForm.get(name) ?? "").trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
    } catch { return undefined; }
  }
  const tiktokUrl = safeUrl("tiktokUrl");
  const instagramUrl = safeUrl("instagramUrl");
  const youtubeUrl = safeUrl("youtubeUrl");
  const facebookUrl = safeUrl("facebookUrl");
  const websiteUrl = safeUrl("websiteUrl");
  if ([tiktokUrl, instagramUrl, youtubeUrl, facebookUrl, websiteUrl].includes(undefined))
    return Response.json({ message: "Social and website links must be complete web addresses beginning with https://." }, { status: 400 });
  if (displayName.length < 2 || displayName.length > 80)
    return Response.json({ message: "Display name must be 2–80 characters." }, { status: 400 });
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    return Response.json({ message: "Username must use 3–24 letters, numbers, or underscores." }, { status: 400 });
  if (!["fan", "artist", "producer", "host"].includes(role))
    return Response.json({ message: "Choose a valid member role." }, { status: 400 });

  const oldPath = member.profile_image_path as string | null;
  let newPath: string | null = oldPath;
  if (file) newPath = await uploadProfileImage(config, member.founder_number as number, file);
  if (removePhoto) newPath = null;
  const update = await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${member.founder_number}`, {
    method: "PATCH",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      display_name: displayName,
      username,
      role,
      show_on_wall: showOnWall,
      bio: bio || null,
      location: location || null,
      genres: genres || null,
      tiktok_profile_url: tiktokUrl,
      instagram_url: instagramUrl,
      youtube_url: youtubeUrl,
      facebook_url: facebookUrl,
      website_url: websiteUrl,
      profile_image_path: newPath,
      profile_image_updated_at: file || removePhoto ? new Date().toISOString() : member.profile_image_updated_at,
    }),
  });
  if (!update.ok) {
    if (file && newPath) await deleteProfileImage(config, newPath);
    const detail = await update.text();
    if (update.status === 409 || detail.includes("duplicate"))
      return Response.json({ message: "That username is already being used." }, { status: 409 });
    return Response.json({ message: "The profile could not be saved." }, { status: 502 });
  }
  if (oldPath && oldPath !== newPath) await deleteProfileImage(config, oldPath);
  return Response.json({ message: "Profile updated successfully.", profileImageUrl: profileImageUrl(config.url, newPath) });
}
