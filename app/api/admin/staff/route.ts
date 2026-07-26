import { requirePermission, serviceConfiguration, type StaffRole } from "@/lib/stagefront-auth";

const roles = new Set<StaffRole>(["owner", "manager", "moderator"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

export async function GET() {
  const owner = await requirePermission("staff");
  const config = serviceConfiguration();
  if (!owner) return Response.json({ message: "Owner access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Staff service is not configured." }, { status: 503 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_staff?select=*&order=created_at.asc`, {
    headers: headers(config.serviceKey), cache: "no-store",
  });
  return response.ok ? Response.json({ staff: await response.json() }) : Response.json({ message: "Unable to load staff." }, { status: 502 });
}

export async function POST(request: Request) {
  const owner = await requirePermission("staff");
  const config = serviceConfiguration();
  if (!owner) return Response.json({ message: "Owner access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Staff service is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  const role = body?.role as StaffRole;
  if (!emailPattern.test(email) || !roles.has(role)) return Response.json({ message: "Enter a valid email and staff level." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_staff?on_conflict=email`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email, display_name: displayName || null, role, active: true, updated_at: new Date().toISOString() }),
  });
  return response.ok ? Response.json({ message: `${email} now has ${role} access.` }) : Response.json({ message: "Staff access could not be saved." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const owner = await requirePermission("staff");
  const config = serviceConfiguration();
  if (!owner) return Response.json({ message: "Owner access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Staff service is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(body?.id);
  const role = body?.role as StaffRole;
  const active = body?.active;
  if (!Number.isSafeInteger(id) || !roles.has(role) || typeof active !== "boolean")
    return Response.json({ message: "Invalid staff update." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/stagefront_staff?id=eq.${id}`, {
    method: "PATCH", headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({ role, active, updated_at: new Date().toISOString() }),
  });
  return response.ok ? Response.json({ message: "Staff access updated." }) : Response.json({ message: "Staff access could not be updated." }, { status: 502 });
}
