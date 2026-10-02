import { authenticatedUser, serviceConfiguration, staffAccess } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

const DAILY_API = "https://api.daily.co/v1";
const ROOM_NAME = "zoo-crew-vibe-controlled-live";

type DailyRoom = { name: string; url: string };
type LiveAction = "start" | "enter" | "end";
type EntryMode = "viewer" | "stage";

function dailyHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

function canControl(role: string | null) {
  return role === "owner" || role === "manager";
}

async function getRoom(apiKey: string): Promise<DailyRoom | null> {
  const response = await fetch(`${DAILY_API}/rooms/${ROOM_NAME}`, { headers: dailyHeaders(apiKey), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Daily room lookup failed.");
  return (await response.json()) as DailyRoom;
}

async function getOrCreateRoom(apiKey: string): Promise<DailyRoom> {
  const existing = await getRoom(apiKey);
  if (existing) return existing;
  const created = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: dailyHeaders(apiKey),
    body: JSON.stringify({ name: ROOM_NAME, privacy: "private", properties: { max_participants: 100, enable_knocking: false, enable_chat: true, start_video_off: true, start_audio_off: true } }),
  });
  if (!created.ok) throw new Error("Daily room creation failed.");
  return (await created.json()) as DailyRoom;
}

async function memberIdentity(userId: string, email: string) {
  const config = serviceConfiguration();
  const fallback = { name: email.split("@")[0], profileImageUrl: null as string | null };
  if (!config) return fallback;
  const headers = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` };
  const profileQuery = new URLSearchParams({ select: "display_name,profile_image_path", user_id: `eq.${userId}`, limit: "1" });
  const profileResponse = await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`, { headers, cache: "no-store" });
  if (profileResponse.ok) {
    const [profile] = (await profileResponse.json()) as { display_name?: string; profile_image_path?: string | null }[];
    if (profile) return { name: profile.display_name?.trim() || fallback.name, profileImageUrl: profileImageUrl(config.url, profile.profile_image_path) };
  }
  const founderQuery = new URLSearchParams({ select: "display_name,profile_image_path", email: `eq.${email.toLowerCase()}`, limit: "1" });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${founderQuery}`, { headers, cache: "no-store" });
  if (!response.ok) return fallback;
  const [member] = (await response.json()) as { display_name?: string; profile_image_path?: string | null }[];
  return member ? { name: member.display_name?.trim() || fallback.name, profileImageUrl: profileImageUrl(config.url, member.profile_image_path) } : fallback;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ message: "Sign in to check the Live House." }, { status: 401 });
  const apiKey = process.env.DAILY_API_KEY?.trim();
  if (!apiKey) return Response.json({ message: "The Live House connection is not configured." }, { status: 503 });
  try {
    const [room, access] = await Promise.all([getRoom(apiKey), staffAccess()]);
    const role = access?.role || null;
    return Response.json({ isLive: Boolean(room), canControlLive: canControl(role), role });
  } catch (error) {
    console.error("Live House status error", error);
    return Response.json({ message: "The Live House status could not be checked." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ message: "Sign in before entering the Live House." }, { status: 401 });
  const apiKey = process.env.DAILY_API_KEY?.trim();
  if (!apiKey) return Response.json({ message: "The Live House connection is not configured." }, { status: 503 });
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: LiveAction; mode?: EntryMode };
    const action = body.action || "enter";
    const access = await staffAccess();
    const role = access?.role || null;
    const canControlLive = canControl(role);
    const canModerate = canControlLive || role === "moderator";
    const entryMode: EntryMode = body.mode === "stage" && canModerate ? "stage" : "viewer";

    if (action === "start") {
      if (!canControlLive) return Response.json({ message: "Only a Zoo Crew owner or manager can start the live." }, { status: 403 });
      await getOrCreateRoom(apiKey);
      return Response.json({ isLive: true, canControlLive, role });
    }
    if (action === "end") {
      if (!canControlLive) return Response.json({ message: "Only a Zoo Crew owner or manager can end the live." }, { status: 403 });
      const response = await fetch(`${DAILY_API}/rooms/${ROOM_NAME}`, { method: "DELETE", headers: dailyHeaders(apiKey) });
      if (!response.ok && response.status !== 404) throw new Error("Daily room deletion failed.");
      return Response.json({ isLive: false, canControlLive, role });
    }

    const room = await getRoom(apiKey);
    if (!room) return Response.json({ message: "The Zoo Crew is offline right now.", isLive: false, canControlLive, role }, { status: 409 });
    const { name, profileImageUrl: imageUrl } = await memberIdentity(user.id, user.email);
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
    const tokenResponse = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(apiKey),
      body: JSON.stringify({ properties: { room_name: room.name, user_id: user.id, user_name: name.slice(0, 50), is_owner: canModerate, permissions: { canSend: entryMode === "viewer" ? [] : ["audio", "video"] }, exp: expires } }),
    });
    if (!tokenResponse.ok) throw new Error("Daily meeting token creation failed.");
    const token = (await tokenResponse.json()) as { token: string };
    return Response.json({ roomUrl: `${room.url}?t=${encodeURIComponent(token.token)}`, name, profileImageUrl: imageUrl, isOwner: role === "owner", canModerate, canControlLive, entryMode, role });
  } catch (error) {
    console.error("Live House room error", error);
    return Response.json({ message: "The Live House could not open. Please try again." }, { status: 502 });
  }
}
