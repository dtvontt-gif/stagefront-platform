import { authenticatedUser, serviceConfiguration, staffAccess } from "@/lib/stagefront-auth";

export const runtime = "nodejs";

const DAILY_API = "https://api.daily.co/v1";
const ROOM_PREFIX = "zoo-crew-vibe-live-";
type Room = { name: string; url: string };

function dailyHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
function dbHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
}
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
async function activeRoom(apiKey: string): Promise<Room | null> {
  const response = await fetch(`${DAILY_API}/rooms?limit=100`, { headers: dailyHeaders(apiKey), cache: "no-store" });
  if (!response.ok) throw new Error("Daily room lookup failed.");
  const result = await response.json() as { data?: Room[] };
  return result.data?.find((room) => room.name.startsWith(ROOM_PREFIX)) || null;
}
async function dbRequest(config: NonNullable<ReturnType<typeof serviceConfiguration>>, table: string, query: URLSearchParams, init?: RequestInit) {
  return fetch(`${config.url}/rest/v1/${table}?${query}`, {
    ...init,
    headers: { ...dbHeaders(config.serviceKey), ...(init?.headers || {}) },
    cache: "no-store",
  });
}
async function isRoomModerator(config: NonNullable<ReturnType<typeof serviceConfiguration>>, roomId: string, userId: string) {
  const query = new URLSearchParams({ select: "user_id", room_id: `eq.${roomId}`, user_id: `eq.${userId}`, revoked_at: "is.null", limit: "1" });
  const response = await dbRequest(config, "zoo_live_room_moderators", query);
  if (!response.ok) return false;
  return ((await response.json()) as unknown[]).length > 0;
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ message: "Sign in to use live safety tools." }, { status: 401 });
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const config = serviceConfiguration();
  if (!apiKey || !config) return Response.json({ message: "Live safety is not configured." }, { status: 503 });

  try {
    const room = await activeRoom(apiKey);
    if (!room) return Response.json({ isLive: false, moderators: [], restrictions: [] });
    const staff = await staffAccess();
    const isOwner = staff?.role === "owner";
    const isStaffMod = staff?.role === "moderator";
    const isLiveMod = isOwner || isStaffMod || await isRoomModerator(config, room.name, user.id);
    const { searchParams } = new URL(request.url);

    if (searchParams.get("view") === "reports") {
      if (!isOwner) return Response.json({ message: "Only Zoo Crew owners can view reports." }, { status: 403 });
      const query = new URLSearchParams({ select: "id,room_id,reporter_user_id,reported_user_id,reported_name,comment_id,comment_body,reason,status,created_at", status: "in.(new,reviewed,actioned,dismissed)", order: "created_at.desc", limit: "100" });
      const response = await dbRequest(config, "zoo_live_reports", query);
      if (!response.ok) return Response.json({ message: "The report inbox could not be loaded." }, { status: 502 });
      return Response.json({ reports: await response.json() });
    }

    const [moderatorResponse, restrictionResponse] = await Promise.all([
      dbRequest(config, "zoo_live_room_moderators", new URLSearchParams({ select: "user_id", room_id: `eq.${room.name}`, revoked_at: "is.null" })),
      dbRequest(config, "zoo_live_room_restrictions", new URLSearchParams({ select: "user_id,restriction,expires_at", room_id: `eq.${room.name}`, or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})` })),
    ]);
    if (!moderatorResponse.ok || !restrictionResponse.ok) return Response.json({ message: "Live safety settings could not be loaded." }, { status: 502 });
    return Response.json({
      isLive: true,
      isOwner,
      canModerate: isLiveMod,
      moderators: ((await moderatorResponse.json()) as { user_id: string }[]).map((item) => item.user_id),
      restrictions: await restrictionResponse.json(),
    });
  } catch (error) {
    console.error("Live safety lookup failed", error);
    return Response.json({ message: "Live safety could not be checked." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ message: "Sign in before using live safety tools." }, { status: 401 });
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const config = serviceConfiguration();
  if (!apiKey || !config) return Response.json({ message: "Live safety is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as {
    action?: string; targetUserId?: string; targetName?: string; commentId?: string; commentBody?: string; reason?: string; reportId?: string; status?: string;
  };
  try {
    const room = await activeRoom(apiKey);
    if (!room) return Response.json({ message: "The live is offline." }, { status: 409 });
    const staff = await staffAccess();
    const isOwner = staff?.role === "owner";
    const isStaffMod = staff?.role === "moderator";
    const isLiveMod = isOwner || isStaffMod || await isRoomModerator(config, room.name, user.id);

    if (body.action === "report") {
      const targetUserId = isUuid(body.targetUserId) ? body.targetUserId : null;
      const reason = String(body.reason || "").trim().slice(0, 500);
      const commentBody = String(body.commentBody || "").trim().slice(0, 500) || null;
      const reportedName = String(body.targetName || "Live participant").trim().slice(0, 80) || "Live participant";
      if (reason.length < 3) return Response.json({ message: "Tell us briefly what happened." }, { status: 400 });
      const response = await dbRequest(config, "zoo_live_reports", new URLSearchParams(), {
        method: "POST",
        body: JSON.stringify({ room_id: room.name, reporter_user_id: user.id, reported_user_id: targetUserId, reported_name: reportedName, comment_id: String(body.commentId || "").slice(0, 80) || null, comment_body: commentBody, reason }),
      });
      if (!response.ok) return Response.json({ message: "The report could not be sent. Try again." }, { status: 502 });
      return Response.json({ sent: true });
    }

    if (!isLiveMod) return Response.json({ message: "Only Zoo Crew owners or live moderators can use this control." }, { status: 403 });

    if (body.action === "assign_moderator" || body.action === "revoke_moderator") {
      if (!isOwner) return Response.json({ message: "Only an owner can assign live moderators." }, { status: 403 });
      if (!isUuid(body.targetUserId) || body.targetUserId === user.id) return Response.json({ message: "Choose another signed-in participant." }, { status: 400 });
      if (body.action === "assign_moderator") {
        const response = await dbRequest(config, "zoo_live_room_moderators", new URLSearchParams(), {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ room_id: room.name, user_id: body.targetUserId, assigned_by: user.id, revoked_at: null }),
        });
        if (!response.ok) return Response.json({ message: "Moderator could not be added." }, { status: 502 });
      } else {
        const query = new URLSearchParams({ room_id: `eq.${room.name}`, user_id: `eq.${body.targetUserId}` });
        const response = await dbRequest(config, "zoo_live_room_moderators", query, { method: "PATCH", body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
        if (!response.ok) return Response.json({ message: "Moderator could not be removed." }, { status: 502 });
      }
      return Response.json({ updated: true });
    }

    if (body.action === "comment_mute" || body.action === "block" || body.action === "unmute" || body.action === "unblock") {
      if (!isUuid(body.targetUserId) || body.targetUserId === user.id) return Response.json({ message: "Choose another participant." }, { status: 400 });
      const restriction = body.action === "comment_mute" || body.action === "unmute" ? "comment_mute" : "blocked";
      const remove = body.action === "unmute" || body.action === "unblock";
      const query = new URLSearchParams({ room_id: `eq.${room.name}`, user_id: `eq.${body.targetUserId}`, restriction: `eq.${restriction}` });
      const response = await dbRequest(config, "zoo_live_room_restrictions", query, remove ? { method: "DELETE" } : {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ room_id: room.name, user_id: body.targetUserId, restriction, actor_user_id: user.id, reason: String(body.reason || "").trim().slice(0, 300) || null }),
      });
      if (!response.ok) return Response.json({ message: "That live restriction could not be saved." }, { status: 502 });
      return Response.json({ updated: true });
    }

    if (body.action === "report_status") {
      if (!isOwner || typeof body.reportId !== "string" || !isUuid(body.reportId) || !["reviewed", "actioned", "dismissed"].includes(body.status || "")) {
        return Response.json({ message: "Only an owner can update a report." }, { status: 403 });
      }
      const query = new URLSearchParams({ id: `eq.${body.reportId}`, room_id: `eq.${room.name}` });
      const response = await dbRequest(config, "zoo_live_reports", query, { method: "PATCH", body: JSON.stringify({ status: body.status }) });
      if (!response.ok) return Response.json({ message: "The report status could not be updated." }, { status: 502 });
      return Response.json({ updated: true });
    }

    return Response.json({ message: "Unknown live safety action." }, { status: 400 });
  } catch (error) {
    console.error("Live safety action failed", error);
    return Response.json({ message: "Live safety action failed." }, { status: 502 });
  }
}
