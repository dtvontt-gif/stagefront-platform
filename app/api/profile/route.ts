import { authenticatedUser, isAdministrator, serviceConfiguration } from "@/lib/stagefront-auth";
import { deleteProfileImage, profileImageUrl, uploadProfileImage, validateProfileImage } from "@/lib/profile-images";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

async function memberForEmail(url: string, key: string, email: string) {
  const query = new URLSearchParams({
    select: "founder_number,display_name,email,username,role,show_on_wall,profile_image_path",
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
    select: "founder_number,display_name,email,username,role,show_on_wall,profile_image_path",
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
  const member =
    isAdministrator(user.email) && Number.isSafeInteger(requestedNumber) && requestedNumber > 0
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
  const requestedNumber = Number(form.get("founderNumber"));
  const member =
    isAdministrator(user.email) && Number.isSafeInteger(requestedNumber) && requestedNumber > 0
      ? await memberForNumber(config.url, config.serviceKey, requestedNumber)
      : await memberForEmail(config.url, config.serviceKey, user.email);
  if (!member) return Response.json({ message: "No matching Founding Member was found." }, { status: 404 });
  const entry = form.get("profilePhoto");
  const file = entry instanceof File && entry.size ? entry : null;
  const removePhoto = form.get("removePhoto") === "true";
  const imageError = validateProfileImage(file);
  if (imageError) return Response.json({ message: imageError }, { status: 400 });
  if (!file && !removePhoto) return Response.json({ message: "Choose a new photo or remove the current one." }, { status: 400 });

  const oldPath = member.profile_image_path as string | null;
  let newPath: string | null = oldPath;
  if (file) newPath = await uploadProfileImage(config, member.founder_number as number, file);
  if (removePhoto) newPath = null;
  const update = await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${member.founder_number}`, {
    method: "PATCH",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({ profile_image_path: newPath, profile_image_updated_at: new Date().toISOString() }),
  });
  if (!update.ok) {
    if (file && newPath) await deleteProfileImage(config, newPath);
    return Response.json({ message: "The profile photo could not be saved." }, { status: 502 });
  }
  if (oldPath && oldPath !== newPath) await deleteProfileImage(config, oldPath);
  return Response.json({ message: removePhoto ? "Profile photo removed." : "Profile photo updated.", profileImageUrl: profileImageUrl(config.url, newPath) });
}
