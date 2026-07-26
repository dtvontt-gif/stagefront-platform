import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

function serviceHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

const statuses = new Set(["waiting", "called", "completed", "skipped", "removed"]);

export async function GET() {
  const admin = await requirePermission("queue");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Queue service is not configured." }, { status: 503 });

  const [settingsResponse, entriesResponse] = await Promise.all([
    fetch(
      `${config.url}/rest/v1/live_queue_settings?id=eq.1&select=is_open,average_minutes`,
      { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
    ),
    fetch(
      `${config.url}/rest/v1/live_queue_entries?select=id,display_name,email,song_title,song_artist,notes,status,created_at&status=neq.removed&order=created_at.asc&limit=200`,
      { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
    ),
  ]);

  if (!settingsResponse.ok || !entriesResponse.ok) {
    return Response.json({ message: "Unable to load the Live Queue." }, { status: 502 });
  }
  const settingsRows = (await settingsResponse.json()) as unknown[];
  return Response.json({
    settings: settingsRows[0] ?? { is_open: false, average_minutes: 5 },
    entries: await entriesResponse.json(),
  });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission("queue");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Queue service is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.type === "settings") {
    const averageMinutes = Number(body.averageMinutes);
    if (typeof body.isOpen !== "boolean" || !Number.isInteger(averageMinutes) || averageMinutes < 1 || averageMinutes > 30) {
      return Response.json({ message: "Enter valid queue settings." }, { status: 400 });
    }
    const response = await fetch(
      `${config.url}/rest/v1/live_queue_settings?id=eq.1`,
      {
        method: "PATCH",
        headers: serviceHeaders(config.serviceKey),
        body: JSON.stringify({
          is_open: body.isOpen,
          average_minutes: averageMinutes,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return response.ok
      ? Response.json({ message: body.isOpen ? "The Live Queue is open." : "The Live Queue is closed." })
      : Response.json({ message: "Queue settings could not be saved." }, { status: 502 });
  }

  const id = Number(body?.id);
  const status = typeof body?.status === "string" ? body.status : "";
  if (!Number.isSafeInteger(id) || !statuses.has(status)) {
    return Response.json({ message: "Choose a valid queue action." }, { status: 400 });
  }
  const response = await fetch(
    `${config.url}/rest/v1/live_queue_entries?id=eq.${id}`,
    {
      method: "PATCH",
      headers: serviceHeaders(config.serviceKey),
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    },
  );
  return response.ok
    ? Response.json({ message: `Queue entry marked ${status}.` })
    : Response.json({ message: "Queue entry could not be updated." }, { status: 502 });
}
