import { authenticatedUser, serviceConfiguration, staffAccess } from "@/lib/stagefront-auth";

const DAILY_API = "https://api.daily.co/v1";
const ROOM_NAME = "zoo-crew-vibe-live";

type DailyRoom = { name: string; url: string };

function dailyHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function displayName(email: string) {
  const config = serviceConfiguration();
  if (!config) return email.split("@")[0];
  const query = new URLSearchParams({ select: "display_name", email: `eq.${email.toLowerCase()}`, limit: "1" });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return email.split("@")[0];
  const [member] = (await response.json()) as { display_name?: string }[];
  return member?.display_name?.trim() || email.split("@")[0];
}

async function getOrCreateRoom(apiKey: string): Promise<DailyRoom> {
  const headers = dailyHeaders(apiKey);
  const existing = await fetch(`${DAILY_API}/rooms/${ROOM_NAME}`, { headers, cache: "no-store" });
  if (existing.ok) return (await existing.json()) as DailyRoom;
  if (existing.status !== 404) throw new Error("Daily room lookup failed.");

  const created = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: ROOM_NAME,
      privacy: "private",
      properties: {
        max_participants: 10,
        enable_knocking: true,
        enable_chat: true,
        start_video_off: true,
        start_audio_off: true,
      },
    }),
  });
  if (!created.ok) throw new Error("Daily room creation failed.");
  return (await created.json()) as DailyRoom;
}

export async function POST() {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ message: "Sign in before entering the Live House." }, { status: 401 });
  const apiKey = process.env.DAILY_API_KEY?.trim();
  if (!apiKey) return Response.json({ message: "The Live House connection is not configured." }, { status: 503 });

  try {
    const [room, name, access] = await Promise.all([getOrCreateRoom(apiKey), displayName(user.email), staffAccess()]);
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
    const tokenResponse = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(apiKey),
      body: JSON.stringify({ properties: { room_name: room.name, user_name: name.slice(0, 50), is_owner: access?.role === "owner", exp: expires } }),
    });
    if (!tokenResponse.ok) throw new Error("Daily meeting token creation failed.");
    const token = (await tokenResponse.json()) as { token: string };
    return Response.json({ roomUrl: `${room.url}?t=${encodeURIComponent(token.token)}`, name, isOwner: access?.role === "owner" });
  } catch (error) {
    console.error("Live House room error", error);
    return Response.json({ message: "The Live House could not open. Please try again." }, { status: 502 });
  }
}
