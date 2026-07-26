import { requireAdministrator, serviceConfiguration } from "@/lib/stagefront-auth";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

const contestantStatuses = new Set([
  "registered",
  "confirmed",
  "performed",
  "advanced",
  "eliminated",
  "finalist",
  "winner",
]);

function dateOrNull(value: unknown) {
  if (!value) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

export async function GET() {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Golden Voices is not configured." }, { status: 503 });

  const [settingsResponse, contestantsResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/golden_voices_settings?id=eq.1&select=*`, {
      headers: headers(config.serviceKey),
      cache: "no-store",
    }),
    fetch(
      `${config.url}/rest/v1/golden_voices_contestants?select=*&order=created_at.asc`,
      { headers: headers(config.serviceKey), cache: "no-store" },
    ),
  ]);
  if (!settingsResponse.ok || !contestantsResponse.ok) {
    return Response.json({ message: "Unable to load Golden Voices." }, { status: 502 });
  }
  const settings = (await settingsResponse.json()) as unknown[];
  return Response.json({ settings: settings[0] ?? null, contestants: await contestantsResponse.json() });
}

export async function PATCH(request: Request) {
  const admin = await requireAdministrator();
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Golden Voices is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.type === "settings") {
    const seasonTitle = typeof body.seasonTitle === "string" ? body.seasonTitle.trim() : "";
    const currentRound = typeof body.currentRound === "string" ? body.currentRound.trim() : "";
    const upcomingShowAt = dateOrNull(body.upcomingShowAt);
    const finalsAt = dateOrNull(body.finalsAt);
    if (
      seasonTitle.length < 2 ||
      seasonTitle.length > 100 ||
      currentRound.length < 2 ||
      currentRound.length > 60 ||
      upcomingShowAt === undefined ||
      finalsAt === undefined ||
      typeof body.registrationOpen !== "boolean" ||
      typeof body.votingOpen !== "boolean"
    ) {
      return Response.json({ message: "Enter valid Golden Voices settings." }, { status: 400 });
    }
    const response = await fetch(
      `${config.url}/rest/v1/golden_voices_settings?id=eq.1`,
      {
        method: "PATCH",
        headers: headers(config.serviceKey),
        body: JSON.stringify({
          season_title: seasonTitle,
          current_round: currentRound,
          upcoming_show_at: upcomingShowAt,
          finals_at: finalsAt,
          registration_open: body.registrationOpen,
          voting_open: body.votingOpen,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return response.ok
      ? Response.json({ message: "Golden Voices settings saved." })
      : Response.json({ message: "Golden Voices settings could not be saved." }, { status: 502 });
  }

  const id = Number(body?.id);
  const status = typeof body?.status === "string" ? body.status : "";
  if (!Number.isSafeInteger(id) || !contestantStatuses.has(status)) {
    return Response.json({ message: "Choose a valid contestant status." }, { status: 400 });
  }
  const response = await fetch(
    `${config.url}/rest/v1/golden_voices_contestants?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers(config.serviceKey),
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    },
  );
  return response.ok
    ? Response.json({ message: `Contestant marked ${status}.` })
    : Response.json({ message: "Contestant status could not be updated." }, { status: 502 });
}
