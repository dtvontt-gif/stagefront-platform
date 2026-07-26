import { serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl, uploadProfileImage, validateProfileImage } from "@/lib/profile-images";

const allowedRoles = new Set(["fan", "artist", "producer", "host"]);
const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";
const headers = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

export async function POST(request: Request) {
  const config = serviceConfiguration();
  if (!config) return Response.json({ message: "Registration is not configured yet." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ message: "Invalid registration request." }, { status: 400 });
  if (text(form.get("website"))) return Response.json({ message: "Registration received." });

  const displayName = text(form.get("displayName"));
  const email = text(form.get("email")).toLowerCase();
  const username = text(form.get("username")).replace(/^@/, "").toLowerCase();
  const role = text(form.get("role")).toLowerCase();
  const showOnWall = form.get("showOnWall") === "on";
  const entry = form.get("profilePhoto");
  const profilePhoto = entry instanceof File && entry.size ? entry : null;

  if (displayName.length < 2 || displayName.length > 80)
    return Response.json({ message: "Enter a name between 2 and 80 characters." }, { status: 400 });
  if (!emailPattern.test(email) || email.length > 254)
    return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  if (!usernamePattern.test(username))
    return Response.json({ message: "Use 3–24 letters, numbers, or underscores." }, { status: 400 });
  if (!allowedRoles.has(role))
    return Response.json({ message: "Choose how you are joining StageFront." }, { status: 400 });
  const imageError = validateProfileImage(profilePhoto);
  if (imageError) return Response.json({ message: imageError }, { status: 400 });

  const insert = await fetch(`${config.url}/rest/v1/founding_members`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=representation" },
    body: JSON.stringify({ display_name: displayName, email, username, role, show_on_wall: showOnWall }),
  });
  if (!insert.ok) {
    const errorText = await insert.text();
    if (insert.status === 409 || errorText.includes("duplicate key"))
      return Response.json({ message: "That email or username is already registered." }, { status: 409 });
    console.error("Supabase registration failed", insert.status, errorText);
    return Response.json({ message: "Registration is temporarily unavailable." }, { status: 502 });
  }

  const [member] = (await insert.json()) as { founder_number: number }[];
  let photoMessage = "";
  if (profilePhoto) {
    try {
      const path = await uploadProfileImage(config, member.founder_number, profilePhoto);
      await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${member.founder_number}`, {
        method: "PATCH",
        headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
        body: JSON.stringify({ profile_image_path: path, profile_image_updated_at: new Date().toISOString() }),
      });
    } catch (error) {
      console.error("Profile photo upload failed", error);
      photoMessage = " Your membership is safe; you can add your photo from your profile later.";
    }
  }
  return Response.json({
    founderNumber: member.founder_number,
    message: `Welcome, StageFront Member #${String(member.founder_number).padStart(4, "0")}. Your username is reserved.${photoMessage}`,
  });
}

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ founders: [] });
  const query = new URLSearchParams({
    select: "founder_number,display_name,username,role,profile_image_path",
    show_on_wall: "eq.true",
    order: "founder_number.asc",
    limit: "1000",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ founders: [] });
  const rows = (await response.json()) as Record<string, unknown>[];
  return Response.json({
    founders: rows.map((row) => ({
      ...row,
      profile_image_url: profileImageUrl(config.url, row.profile_image_path as string | null),
    })),
  });
}
