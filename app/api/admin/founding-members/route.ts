import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";
import { deleteProfileImage, profileImageUrl } from "@/lib/profile-images";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function GET() {
  const access = await requirePermission("profiles");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Profile-management access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const query = new URLSearchParams({
    select: "founder_number,display_name,email,username,role,show_on_wall,created_at,profile_image_path",
    order: "founder_number.asc",
    limit: "1000",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ message: "Unable to load Founding Members." }, { status: 502 });
  const rows = (await response.json()) as Record<string, unknown>[];
  return Response.json({ members: rows.map((row) => ({
    ...row,
    profile_image_url: profileImageUrl(config.url, row.profile_image_path as string | null),
  })) });
}

export async function PATCH(request: Request) {
  const access = await requirePermission("profiles");
  const config = serviceConfiguration();
  if (!access) return Response.json({ message: "Profile-management access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    founderNumber?: unknown;
    showOnWall?: unknown;
    reason?: unknown;
    action?: unknown;
  } | null;
  const founderNumber = Number(body?.founderNumber);
  const showOnWall = body?.showOnWall;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (body?.action === "remove-photo" && Number.isSafeInteger(founderNumber)) {
    const lookup = await fetch(
      `${config.url}/rest/v1/founding_members?select=profile_image_path&founder_number=eq.${founderNumber}&limit=1`,
      { headers: headers(config.serviceKey), cache: "no-store" },
    );
    const [member] = lookup.ok ? ((await lookup.json()) as { profile_image_path?: string | null }[]) : [];
    if (!member) return Response.json({ message: "Member not found." }, { status: 404 });
    const update = await fetch(`${config.url}/rest/v1/founding_members?founder_number=eq.${founderNumber}`, {
      method: "PATCH",
      headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
      body: JSON.stringify({ profile_image_path: null, profile_image_updated_at: new Date().toISOString() }),
    });
    if (!update.ok) return Response.json({ message: "Photo could not be removed." }, { status: 502 });
    await deleteProfileImage(config, member.profile_image_path);
    return Response.json({ message: "Profile photo removed. Member status was preserved." });
  }
  if (!Number.isSafeInteger(founderNumber) || typeof showOnWall !== "boolean") {
    return Response.json({ message: "Invalid Wall override." }, { status: 400 });
  }

  const update = await fetch(
    `${config.url}/rest/v1/founding_members?founder_number=eq.${founderNumber}`,
    {
      method: "PATCH",
      headers: { ...headers(config.serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({ show_on_wall: showOnWall }),
    },
  );
  if (!update.ok) {
    return Response.json({ message: "The Wall override could not be saved." }, { status: 502 });
  }
  const changed = (await update.json()) as unknown[];
  if (!changed.length) return Response.json({ message: "Member not found." }, { status: 404 });

  await fetch(`${config.url}/rest/v1/admin_wall_overrides`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      founder_number: founderNumber,
      administrator_user_id: access.user.id,
      administrator_email: access.user.email,
      show_on_wall: showOnWall,
      reason: reason || null,
    }),
  });

  return Response.json({
    message: showOnWall
      ? "Member added to the Wall. Founding Member status was preserved."
      : "Member removed from the Wall. Founding Member status was preserved.",
  });
}
