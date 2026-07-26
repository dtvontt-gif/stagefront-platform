import { requireAdministrator, serviceConfiguration } from "@/lib/stagefront-auth";

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function validTikTokUrl(value: unknown) {
  if (value === "" || value === null) return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)tiktok\.com$/i.test(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function GET() {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const query = new URLSearchParams({
    select:
      "founder_number,display_name,username,email,tiktok_profile_url,tiktok_live_url,is_live,host_published",
    role: "eq.host",
    order: "founder_number.asc",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: serviceHeaders(config.serviceKey),
    cache: "no-store",
  });
  return response.ok
    ? Response.json({ hosts: await response.json() })
    : Response.json({ message: "Unable to load hosts." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const founderNumber = Number(body?.founder_number);
  const profileUrl = validTikTokUrl(body?.tiktok_profile_url);
  const liveUrl = validTikTokUrl(body?.tiktok_live_url);
  if (
    !Number.isSafeInteger(founderNumber) ||
    profileUrl === undefined ||
    liveUrl === undefined ||
    typeof body?.is_live !== "boolean" ||
    typeof body?.host_published !== "boolean"
  ) {
    return Response.json({ message: "Enter valid TikTok links beginning with https://." }, { status: 400 });
  }

  const response = await fetch(
    `${config.url}/rest/v1/founding_members?founder_number=eq.${founderNumber}&role=eq.host`,
    {
      method: "PATCH",
      headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({
        tiktok_profile_url: profileUrl,
        tiktok_live_url: liveUrl,
        is_live: body.is_live,
        host_published: body.host_published,
      }),
    },
  );
  if (!response.ok) return Response.json({ message: "Host settings could not be saved." }, { status: 502 });
  const changed = (await response.json()) as unknown[];
  if (!changed.length) return Response.json({ message: "Host not found." }, { status: 404 });
  return Response.json({ message: "Host profile and live status saved." });
}
