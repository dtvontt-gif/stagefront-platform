import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { deleteProfileImage, profileImageUrl, uploadProfileImage, validateProfileImage } from "@/lib/profile-images";

const serviceHeaders = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
async function getProfile(url: string, key: string, userId: string) {
  const query = new URLSearchParams({ select: "*", user_id: `eq.${userId}`, limit: "1" });
  const response = await fetch(`${url}/rest/v1/stagefront_profiles?${query}`, { headers: serviceHeaders(key), cache: "no-store" });
  const [profile] = response.ok ? await response.json() as Record<string, unknown>[] : [];
  return profile || null;
}
export async function GET() {
  const [user, config] = await Promise.all([authenticatedUser(), Promise.resolve(serviceConfiguration())]);
  if (!user?.email) return Response.json({ message: "Sign in to manage your profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  let profile = await getProfile(config.url, config.serviceKey, user.id);
  if (!profile) {
    const username = `${user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 16)}_${user.id.slice(0, 5)}`;
    await fetch(`${config.url}/rest/v1/stagefront_profiles`, { method: "POST", headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=representation" }, body: JSON.stringify({ user_id: user.id, email: user.email.toLowerCase(), username, display_name: user.email.split("@")[0] }) });
    profile = await getProfile(config.url, config.serviceKey, user.id);
  }
  return Response.json({ profile: profile ? { ...profile, profile_image_url: profileImageUrl(config.url, profile.profile_image_path as string | null) } : null });
}
export async function PATCH(request: Request) {
  const user = await authenticatedUser(); const config = serviceConfiguration();
  if (!user?.email) return Response.json({ message: "Sign in to edit your profile." }, { status: 401 });
  if (!config) return Response.json({ message: "Profile service is not configured." }, { status: 503 });
  const profile = await getProfile(config.url, config.serviceKey, user.id); if (!profile) return Response.json({ message: "Open your profile once before editing it." }, { status: 404 });
  const form = await request.formData(); const entry = form.get("profilePhoto"); const file = entry instanceof File && entry.size ? entry : null; const imageError = validateProfileImage(file); if (imageError) return Response.json({ message: imageError }, { status: 400 });
  const displayName = String(form.get("displayName") || "").trim(); const username = String(form.get("username") || "").trim().replace(/^@/, "").toLowerCase(); const role = String(form.get("role") || "singer");
  if (displayName.length < 2 || displayName.length > 80 || !/^[a-z0-9_]{3,24}$/.test(username)) return Response.json({ message: "Use a 2–80 character stage name and a 3–24 character username." }, { status: 400 });
  if (!["singer","songwriter","musician","producer","fan","host"].includes(role)) return Response.json({ message: "Choose a valid role." }, { status: 400 });
  const oldPath = profile.profile_image_path as string | null; let imagePath = oldPath; if (file) imagePath = await uploadProfileImage(config, user.id, file); if (form.get("removePhoto") === "true") imagePath = null;
  const response = await fetch(`${config.url}/rest/v1/stagefront_profiles?user_id=eq.${user.id}`, { method: "PATCH", headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=minimal" }, body: JSON.stringify({ display_name: displayName, username, role, bio: String(form.get("bio") || "").trim().slice(0,600) || null, genres: String(form.get("genres") || "").trim().slice(0,180) || null, location: String(form.get("location") || "").trim().slice(0,100) || null, looking_for: String(form.get("lookingFor") || "").trim().slice(0,240) || null, is_public: form.get("isPublic") === "on", profile_image_path: imagePath, updated_at: new Date().toISOString() }) });
  if (!response.ok) { if (file && imagePath) await deleteProfileImage(config, imagePath); return Response.json({ message: "That username may already be in use." }, { status: 409 }); }
  if (oldPath && oldPath !== imagePath) await deleteProfileImage(config, oldPath); return Response.json({ message: "Your StageFront profile is updated." });
}
