import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalUrl(value: unknown) {
  const candidate = text(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function payload(body: Record<string, unknown>) {
  const displayName = text(body.displayName, 80);
  const competition = text(body.competition, 30);
  const title = text(body.title, 100);
  const seasonLabel = text(body.seasonLabel, 100);
  const bio = text(body.bio, 600);
  const photoUrl = optionalUrl(body.photoUrl);
  const videoUrl = optionalUrl(body.videoUrl);
  const socialUrl = optionalUrl(body.socialUrl);
  const wonAt = text(body.wonAt, 10);
  const displayOrder = Number(body.displayOrder ?? 0);
  if (
    displayName.length < 2 ||
    title.length < 2 ||
    !["box_battle", "golden_voices"].includes(competition) ||
    photoUrl === undefined ||
    videoUrl === undefined ||
    socialUrl === undefined ||
    (wonAt && !/^\d{4}-\d{2}-\d{2}$/.test(wonAt)) ||
    !Number.isSafeInteger(displayOrder)
  ) return null;
  return {
    display_name: displayName,
    competition,
    title,
    season_label: seasonLabel,
    bio,
    photo_url: photoUrl,
    video_url: videoUrl,
    social_url: socialUrl,
    won_at: wonAt || null,
    featured: Boolean(body.featured),
    published: body.published !== false,
    display_order: displayOrder,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  const admin = await requirePermission("contests");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Winner spotlights are not configured." }, { status: 503 });
  const response = await fetch(
    `${config.url}/rest/v1/stagefront_winners?select=*&order=featured.desc,display_order.asc,created_at.desc`,
    { headers: headers(config.serviceKey), cache: "no-store" },
  );
  return response.ok
    ? Response.json({ winners: await response.json() })
    : Response.json({ message: "Unable to load winners. Run the winners setup in Supabase first." }, { status: 502 });
}

export async function POST(request: Request) {
  const admin = await requirePermission("contests");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Winner spotlights are not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const values = body ? payload(body) : null;
  if (!values) return Response.json({ message: "Complete the winner details with valid links." }, { status: 400 });

  if (values.featured) {
    await fetch(`${config.url}/rest/v1/stagefront_winners?featured=eq.true`, {
      method: "PATCH",
      headers: headers(config.serviceKey),
      body: JSON.stringify({ featured: false, updated_at: new Date().toISOString() }),
    });
  }
  const response = await fetch(`${config.url}/rest/v1/stagefront_winners`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify(values),
  });
  return response.ok
    ? Response.json({ message: "Winner spotlight added." })
    : Response.json({ message: "Winner spotlight could not be saved." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission("contests");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Winner spotlights are not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(body?.id);
  const values = body ? payload(body) : null;
  if (!Number.isSafeInteger(id) || !values) {
    return Response.json({ message: "Enter valid winner details." }, { status: 400 });
  }
  if (values.featured) {
    await fetch(`${config.url}/rest/v1/stagefront_winners?featured=eq.true&id=neq.${id}`, {
      method: "PATCH",
      headers: headers(config.serviceKey),
      body: JSON.stringify({ featured: false, updated_at: new Date().toISOString() }),
    });
  }
  const response = await fetch(`${config.url}/rest/v1/stagefront_winners?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(config.serviceKey),
    body: JSON.stringify(values),
  });
  return response.ok
    ? Response.json({ message: "Winner spotlight updated." })
    : Response.json({ message: "Winner spotlight could not be updated." }, { status: 502 });
}

export async function DELETE(request: Request) {
  const admin = await requirePermission("contests");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Winner spotlights are not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isSafeInteger(id)) return Response.json({ message: "Invalid winner." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_winners?id=eq.${id}`, {
    method: "DELETE",
    headers: headers(config.serviceKey),
  });
  return response.ok
    ? Response.json({ message: "Winner spotlight removed." })
    : Response.json({ message: "Winner spotlight could not be removed." }, { status: 502 });
}

