import { cookies } from "next/headers";
import { serviceConfiguration } from "@/lib/stagefront-auth";

const VOTER_COOKIE = "stagefront_golden_voices_voter";

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function POST(request: Request) {
  const config = serviceConfiguration();
  if (!config) return Response.json({ message: "Voting is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { contestantId?: unknown } | null;
  const contestantId = Number(body?.contestantId);
  if (!Number.isSafeInteger(contestantId)) {
    return Response.json({ message: "Choose a valid contestant." }, { status: 400 });
  }

  const settingsResponse = await fetch(
    `${config.url}/rest/v1/golden_voices_settings?id=eq.1&select=current_round,voting_open`,
    { headers: headers(config.serviceKey), cache: "no-store" },
  );
  const settingsRows = settingsResponse.ok
    ? ((await settingsResponse.json()) as { current_round: string; voting_open: boolean }[])
    : [];
  const settings = settingsRows[0];
  if (!settings?.voting_open) {
    return Response.json({ message: "Golden Voices voting is currently closed." }, { status: 409 });
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(VOTER_COOKIE)?.value;
  const voterToken = existingToken && /^[0-9a-f-]{36}$/i.test(existingToken)
    ? existingToken
    : crypto.randomUUID();

  const contestantResponse = await fetch(
    `${config.url}/rest/v1/golden_voices_contestants?id=eq.${contestantId}&status=in.(confirmed,performed,advanced,finalist)&select=id`,
    { headers: headers(config.serviceKey), cache: "no-store" },
  );
  const contestants = contestantResponse.ok ? ((await contestantResponse.json()) as unknown[]) : [];
  if (!contestants.length) {
    return Response.json({ message: "That contestant is not eligible in this round." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/golden_voices_votes`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      contestant_id: contestantId,
      round_name: settings.current_round,
      voter_token: voterToken,
    }),
  });
  if (response.status === 409) {
    return Response.json({ message: "You already voted in this round." }, { status: 409 });
  }
  if (!response.ok) {
    return Response.json({ message: "Your vote could not be recorded." }, { status: 502 });
  }
  cookieStore.set(VOTER_COOKIE, voterToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return Response.json({ message: "Your Golden Voices vote is counted." });
}
