import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

export async function GET() {
  const [admin, config] = await Promise.all([requirePermission("contests"), Promise.resolve(serviceConfiguration())]);
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Originals are not configured." }, { status: 503 });
  const response = await fetch(`${config.url}/rest/v1/original_artist_submissions?select=*&order=created_at.desc`, {
    headers: headers(config.serviceKey), cache: "no-store",
  });
  return response.ok
    ? Response.json({ submissions: await response.json() })
    : Response.json({ message: "Unable to load original music submissions." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const [admin, config] = await Promise.all([requirePermission("contests"), Promise.resolve(serviceConfiguration())]);
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Originals are not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown; featured?: unknown } | null;
  const id = Number(body?.id);
  const status = typeof body?.status === "string" ? body.status : "";
  if (!Number.isSafeInteger(id) || !["pending", "approved", "rejected"].includes(status)) {
    return Response.json({ message: "Choose a valid submission status." }, { status: 400 });
  }
  if (body?.featured === true) {
    await fetch(`${config.url}/rest/v1/original_artist_submissions?featured=eq.true&id=neq.${id}`, {
      method: "PATCH", headers: headers(config.serviceKey), body: JSON.stringify({ featured: false }),
    });
  }
  const response = await fetch(`${config.url}/rest/v1/original_artist_submissions?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(config.serviceKey),
    body: JSON.stringify({ status, featured: body?.featured === true, updated_at: new Date().toISOString() }),
  });
  return response.ok
    ? Response.json({ message: `Original submission marked ${status}.` })
    : Response.json({ message: "Submission could not be updated." }, { status: 502 });
}

