import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

function serviceHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function PATCH(request: Request) {
  const access = await requirePermission("hosts");
  const config = serviceConfiguration();
  if (!access) {
    return Response.json({ message: "Host-management access required." }, { status: 403 });
  }
  if (!config) {
    return Response.json({ message: "Admin service is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    founder_number?: unknown;
    is_live?: unknown;
  } | null;
  const founderNumber = Number(body?.founder_number);
  if (!Number.isSafeInteger(founderNumber) || typeof body?.is_live !== "boolean") {
    return Response.json({ message: "Choose a valid host and live status." }, { status: 400 });
  }

  const response = await fetch(
    `${config.url}/rest/v1/founding_members?founder_number=eq.${founderNumber}&role=eq.host`,
    {
      method: "PATCH",
      headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({ is_live: body.is_live }),
    },
  );
  if (!response.ok) {
    return Response.json({ message: "The host's live status could not be saved." }, { status: 502 });
  }
  const changed = (await response.json()) as unknown[];
  if (!changed.length) return Response.json({ message: "Host not found." }, { status: 404 });

  return Response.json({
    message: body.is_live ? "Host is LIVE on StageFront." : "Host is now offline on StageFront.",
  });
}
