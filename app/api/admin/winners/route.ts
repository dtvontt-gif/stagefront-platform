import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";
import { uploadWinnerImage, validateProfileImage } from "@/lib/profile-images";

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

async function winnerRequest(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const photoEntry = form.get("photo");
  const photo = photoEntry instanceof File && photoEntry.size ? photoEntry : null;
  const imageError = validateProfileImage(photo);
  if (imageError) return { error: imageError };
  const values = payload({
    displayName: form.get("displayName"),
    competition: form.get("competition"),
    title: form.get("title"),
    seasonLabel: form.get("seasonLabel"),
    bio: form.get("bio"),
    photoUrl: form.get("existingPhotoUrl"),
    videoUrl: form.get("videoUrl"),
    socialUrl: form.get("socialUrl"),
    featured: form.get("featured") === "true",
    published: form.get("published") === "true",
    wonAt: form.get("wonAt"),
    displayOrder: form.get("displayOrder"),
  });
  return {
    id: Number(form.get("id")),
    photo,
    values,
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
  const input = await winnerRequest(request);
  if (!input || "error" in input) {
    return Response.json({ message: input?.error ?? "Complete the winner details." }, { status: 400 });
  }
  const values = input.values;
  if (!values) return Response.json({ message: "Complete the winner details with valid links." }, { status: 400 });
  if (input.photo) {
    try {
      const upload = await uploadWinnerImage(config, input.photo);
      values.photo_url = upload.url;
    } catch {
      return Response.json({ message: "The winner photo could not be uploaded." }, { status: 502 });
    }
  }

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
  const input = await winnerRequest(request);
  if (!input || "error" in input) {
    return Response.json({ message: input?.error ?? "Enter valid winner details." }, { status: 400 });
  }
  const id = input.id;
  const values = input.values;
  if (!Number.isSafeInteger(id) || !values) {
    return Response.json({ message: "Enter valid winner details." }, { status: 400 });
  }
  if (input.photo) {
    try {
      const upload = await uploadWinnerImage(config, input.photo);
      values.photo_url = upload.url;
    } catch {
      return Response.json({ message: "The winner photo could not be uploaded." }, { status: 502 });
    }
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
