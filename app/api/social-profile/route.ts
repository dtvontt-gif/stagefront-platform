import { authenticatedUser, requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";
import { deleteProfileImage, profileImageUrl, uploadProfileImage, validateProfileImage } from "@/lib/profile-images";

const serviceHeaders = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

async function getProfile(url: string, key: string, userId: string) {
  const query = new URLSearchParams({ select: "*", user_id: `eq.${userId}`, limit: "1" });
  const response = await fetch(`${url}/rest/v1/stagefront_profiles?${query}`, { headers: serviceHeaders(key), cache: "no-store" });
  const [profile] = response.ok ? await response.json() as Record<string, unknown>[] : [];
  return profile ?? null;
}

async function managedTarget(requestedUserId: string | null, signedInUserId: string) {
  if (!requestedUserId || requestedUserId === signedInUserId) return { userId: signedInUserId, managed: false };
  const access = await requirePermission("profiles");
  return access ? { userId: requestedUserId, managed: true } : null;
}

async function syncHostDiscovery(
  config: NonNullable<ReturnType<typeof serviceConfiguration>>,
  profile: Record<string, unknown>,
  update: { displayName: string; username: string; role: string },
) {
  const email = String(profile.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, message: "This account profile has no email address to link with Host Discovery." };
  const query = new URLSearchParams({ select: "founder_number", email: `eq.${email}`, limit: "1" });
  const lookup = await fetch(`${config.url}/rest/v1/founding_members?${query}`, { headers: serviceHeaders(config.serviceKey), cache: "no-store" });
  const [founder] = lookup.ok ? await lookup.json() as { founder_number: number }[] : [];

  if (founder) {
    const response = await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${founder.founder_number}`, {
      method: "PATCH",
      headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=minimal" },
      body: JSON.stringify(update.role === "host"
        ? { role: "host", host_published: true }
        : { host_published: false, is_live: false }),
    });
    return response.ok ? { ok: true } : { ok: false, message: "The member profile saved, but Host Discovery could not be updated." };
  }

  if (update.role !== "host") return { ok: true };
  const response = await fetch(`${config.url}/rest/v1/founding_members`, {
    method: "POST",
    headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      display_name: update.displayName,
      email,
      username: update.username,
      role: "host",
      show_on_wall: false,
      host_published: true,
    }),
  });
  return response.ok
    ? { ok: true }
    : { ok: false, message: "The member profile saved, but its Host Discovery record could not be created. The email or username may already belong to another original member." };
}

export async function GET(request: Request) {
  const [user, config] = await Promise.all([authenticatedUser(), Promise.resolve(serviceConfiguration())]);
  if (!user?.email) return Response.json({ message: "Sign in to manage a profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const requestedUserId = new URL(request.url).searchParams.get("user");
  const target = await managedTarget(requestedUserId, user.id);
  if (!target) return Response.json({ message: "Profile manager access required." }, { status: 403 });

  let profile = await getProfile(config.url, config.serviceKey, target.userId);
  if (!profile && !target.managed) {
    const username = `${user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 16)}_${user.id.slice(0, 5)}`;
    await fetch(`${config.url}/rest/v1/stagefront_profiles`, {
      method: "POST",
      headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user.id, email: user.email.toLowerCase(), username, display_name: user.email.split("@")[0] }),
    });
    profile = await getProfile(config.url, config.serviceKey, user.id);
  }
  if (!profile) return Response.json({ message: "That account profile was not found." }, { status: 404 });
  return Response.json({ profile: { ...profile, profile_image_url: profileImageUrl(config.url, profile.profile_image_path as string | null) } });
}

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  const config = serviceConfiguration();
  if (!user?.email) return Response.json({ message: "Sign in to edit a profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const form = await request.formData();
  const requestedUserId = String(form.get("managedUserId") ?? "").trim() || null;
  const target = await managedTarget(requestedUserId, user.id);
  if (!target) return Response.json({ message: "Profile manager access required." }, { status: 403 });
  const profile = await getProfile(config.url, config.serviceKey, target.userId);
  if (!profile) return Response.json({ message: "That account profile was not found." }, { status: 404 });

  const entry = form.get("profilePhoto");
  const file = entry instanceof File && entry.size ? entry : null;
  const imageError = validateProfileImage(file);
  if (imageError) return Response.json({ message: imageError }, { status: 400 });
  const displayName = String(form.get("displayName") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().replace(/^@/, "").toLowerCase();
  const role = String(form.get("role") ?? "singer");
  if (displayName.length < 2 || displayName.length > 80 || !/^[a-z0-9_]{3,24}$/.test(username))
    return Response.json({ message: "Use a 2–80 character stage name and a 3–24 character username." }, { status: 400 });
  if (!["singer", "songwriter", "musician", "producer", "fan", "host"].includes(role))
    return Response.json({ message: "Choose a valid role." }, { status: 400 });

  const oldPath = profile.profile_image_path as string | null;
  let imagePath = oldPath;
  if (file) imagePath = await uploadProfileImage(config, target.userId, file);
  if (form.get("removePhoto") === "true") imagePath = null;
  const response = await fetch(`${config.url}/rest/v1/stagefront_profiles?user_id=eq.${target.userId}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      display_name: displayName,
      username,
      role,
      bio: String(form.get("bio") ?? "").trim().slice(0, 600) || null,
      genres: String(form.get("genres") ?? "").trim().slice(0, 180) || null,
      location: String(form.get("location") ?? "").trim().slice(0, 100) || null,
      looking_for: String(form.get("lookingFor") ?? "").trim().slice(0, 240) || null,
      is_public: form.get("isPublic") === "on",
      profile_image_path: imagePath,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    if (file && imagePath) await deleteProfileImage(config, imagePath);
    return Response.json({ message: "That username may already be in use." }, { status: 409 });
  }
  if (oldPath && oldPath !== imagePath) await deleteProfileImage(config, oldPath);

  if (target.managed) {
    const sync = await syncHostDiscovery(config, profile, { displayName, username, role });
    if (!sync.ok) return Response.json({ message: sync.message }, { status: 502 });
  }
  return Response.json({ message: role === "host" && target.managed ? "Profile updated and added to Host Discovery." : "StageFront profile updated." });
}
