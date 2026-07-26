import { requireAdministrator, serviceConfiguration } from "@/lib/stagefront-auth";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function GET() {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const query = new URLSearchParams({
    select: "founder_number,display_name,email,username,role,show_on_wall,created_at",
    order: "founder_number.asc",
    limit: "1000",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  return response.ok
    ? Response.json({ members: await response.json() })
    : Response.json({ message: "Unable to load Founding Members." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    founderNumber?: unknown;
    showOnWall?: unknown;
    reason?: unknown;
  } | null;
  const founderNumber = Number(body?.founderNumber);
  const showOnWall = body?.showOnWall;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
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
      administrator_user_id: admin.id,
      administrator_email: admin.email,
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
