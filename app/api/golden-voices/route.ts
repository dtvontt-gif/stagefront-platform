import { serviceConfiguration } from "@/lib/stagefront-auth";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ settings: null, contestants: [] });

  const [settingsResponse, contestantsResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/golden_voices_settings?id=eq.1&select=*`, {
      headers: headers(config.serviceKey),
      cache: "no-store",
    }),
    fetch(
      `${config.url}/rest/v1/golden_voices_contestants?select=id,display_name,username,song_title,song_artist,status&status=neq.registered&order=created_at.asc`,
      { headers: headers(config.serviceKey), cache: "no-store" },
    ),
  ]);
  if (!settingsResponse.ok || !contestantsResponse.ok) {
    return Response.json({ settings: null, contestants: [] });
  }
  const settingsRows = (await settingsResponse.json()) as { current_round: string }[];
  const settings = settingsRows[0] ?? null;
  const contestants = (await contestantsResponse.json()) as { id: number }[];

  const votesResponse = settings
    ? await fetch(
        `${config.url}/rest/v1/golden_voices_votes?select=contestant_id&round_name=eq.${encodeURIComponent(settings.current_round)}&limit=10000`,
        { headers: headers(config.serviceKey), cache: "no-store" },
      )
    : null;
  const votes = votesResponse?.ok
    ? ((await votesResponse.json()) as { contestant_id: number }[])
    : [];
  const totals = votes.reduce<Record<number, number>>((result, vote) => {
    result[vote.contestant_id] = (result[vote.contestant_id] ?? 0) + 1;
    return result;
  }, {});

  return Response.json({
    settings,
    contestants: contestants.map((contestant) => ({
      ...contestant,
      votes: totals[contestant.id] ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const config = serviceConfiguration();
  if (!config) return Response.json({ message: "Golden Voices is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (text(body?.website, 200)) return Response.json({ message: "Registration received." });

  const displayName = text(body?.displayName, 80);
  const email = text(body?.email, 254).toLowerCase();
  const username = text(body?.username, 24).replace(/^@/, "").toLowerCase();
  const songTitle = text(body?.songTitle, 120);
  const songArtist = text(body?.songArtist, 120);
  if (
    displayName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[a-z0-9_]{3,24}$/.test(username) ||
    !songTitle ||
    !songArtist
  ) {
    return Response.json(
      { message: "Complete every field with valid StageFront information." },
      { status: 400 },
    );
  }

  const settingsResponse = await fetch(
    `${config.url}/rest/v1/golden_voices_settings?id=eq.1&select=season_title,registration_open`,
    { headers: headers(config.serviceKey), cache: "no-store" },
  );
  const rows = settingsResponse.ok
    ? ((await settingsResponse.json()) as { season_title: string; registration_open: boolean }[])
    : [];
  const settings = rows[0];
  if (!settings?.registration_open) {
    return Response.json({ message: "Golden Voices registration is currently closed." }, { status: 409 });
  }

  const response = await fetch(`${config.url}/rest/v1/golden_voices_contestants`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      season_title: settings.season_title,
      display_name: displayName,
      email,
      username,
      song_title: songTitle,
      song_artist: songArtist,
    }),
  });
  if (response.status === 409) {
    return Response.json(
      { message: "That email or username is already registered for this season." },
      { status: 409 },
    );
  }
  return response.ok
    ? Response.json({ message: "Golden Voices registration confirmed. There is no entry fee." })
    : Response.json({ message: "Registration could not be saved." }, { status: 502 });
}
