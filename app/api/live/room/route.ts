import {
  authenticatedUser,
  serviceConfiguration,
  staffAccess,
} from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

const DAILY_API = "https://api.daily.co/v1";
type LiveExperience = "zoo" | "jungle";

function liveExperience(value: unknown): LiveExperience {
  return value === "jungle" ? "jungle" : "zoo";
}

function roomPrefix(experience: LiveExperience) {
  const environment =
    process.env.VERCEL_ENV === "production" ? "live" : "preview";
  return experience === "jungle"
    ? `stagefront-jungle-${environment}-`
    : `zoo-crew-vibe-${environment}-`;
}

type DailyRoom = { name: string; url: string };
type LiveAction = "start" | "enter" | "end" | "gift";
type EntryMode = "viewer" | "stage";

function dailyHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function canControl(role: string | null) {
  return role === "owner" || role === "manager";
}

function starterId(room: DailyRoom | null, experience: LiveExperience) {
  const prefix = roomPrefix(experience);
  const id = room?.name.startsWith(prefix)
    ? room.name.slice(prefix.length)
    : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    id,
  )
    ? id
    : null;
}

async function getRoom(
  apiKey: string,
  experience: LiveExperience,
): Promise<DailyRoom | null> {
  const response = await fetch(`${DAILY_API}/rooms?limit=100`, {
    headers: dailyHeaders(apiKey),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Daily room lookup failed.");
  const { data } = (await response.json()) as { data: DailyRoom[] };
  return data.find((room) => starterId(room, experience)) || null;
}

async function getOrCreateRoom(
  apiKey: string,
  userId: string,
  experience: LiveExperience,
): Promise<DailyRoom> {
  const existing = await getRoom(apiKey, experience);
  if (existing) return existing;
  const created = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: dailyHeaders(apiKey),
    body: JSON.stringify({
      name: `${roomPrefix(experience)}${userId}`,
      privacy: "private",
      properties: {
        max_participants: 100,
        enable_knocking: false,
        enable_chat: true,
        start_video_off: true,
        start_audio_off: true,
      },
    }),
  });
  if (!created.ok) throw new Error("Daily room creation failed.");
  return (await created.json()) as DailyRoom;
}

async function memberIdentity(userId: string, email: string) {
  const config = serviceConfiguration();
  const fallback = {
    name: email.split("@")[0],
    username: email.split("@")[0],
    profileImageUrl: null as string | null,
  };
  if (!config) return fallback;
  const headers = {
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
  };
  const profileQuery = new URLSearchParams({
    select: "display_name,username,profile_image_path",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const profileResponse = await fetch(
    `${config.url}/rest/v1/stagefront_profiles?${profileQuery}`,
    { headers, cache: "no-store" },
  );
  if (profileResponse.ok) {
    const [profile] = (await profileResponse.json()) as {
      display_name?: string;
      username?: string;
      profile_image_path?: string | null;
    }[];
    if (profile)
      return {
        name: profile.display_name?.trim() || fallback.name,
        username: profile.username?.trim() || fallback.username,
        profileImageUrl: profileImageUrl(
          config.url,
          profile.profile_image_path,
        ),
      };
  }
  const founderQuery = new URLSearchParams({
    select: "display_name,username,profile_image_path",
    email: `eq.${email.toLowerCase()}`,
    limit: "1",
  });
  const response = await fetch(
    `${config.url}/rest/v1/founding_members?${founderQuery}`,
    { headers, cache: "no-store" },
  );
  if (!response.ok) return fallback;
  const [member] = (await response.json()) as {
    display_name?: string;
    username?: string;
    profile_image_path?: string | null;
  }[];
  return member
    ? {
        name: member.display_name?.trim() || fallback.name,
        username: member.username?.trim() || fallback.username,
        profileImageUrl: profileImageUrl(config.url, member.profile_image_path),
      }
    : fallback;
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email)
    return Response.json(
      { message: "Sign in to check the Live House." },
      { status: 401 },
    );
  const apiKey = process.env.DAILY_API_KEY?.trim();
  if (!apiKey)
    return Response.json(
      { message: "The Live House connection is not configured." },
      { status: 503 },
    );
  try {
    const experience = liveExperience(
      new URL(request.url).searchParams.get("experience"),
    );
    const [room, access] = await Promise.all([
      getRoom(apiKey, experience),
      staffAccess(),
    ]);
    const role = access?.role || null;
    return Response.json({
      isLive: Boolean(room),
      canControlLive: canControl(role),
      canEndLive: canControl(role) && starterId(room, experience) === user.id,
      role,
    });
  } catch (error) {
    console.error("Live House status error", error);
    return Response.json(
      { message: "The Live House status could not be checked." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email)
    return Response.json(
      { message: "Sign in before entering the Live House." },
      { status: 401 },
    );
  const apiKey = process.env.DAILY_API_KEY?.trim();
  if (!apiKey)
    return Response.json(
      { message: "The Live House connection is not configured." },
      { status: 503 },
    );
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: LiveAction;
      mode?: EntryMode;
      giftId?: string;
      eventId?: string;
      experience?: string;
    };
    const experience = liveExperience(body.experience);
    const action = body.action || "enter";
    const access = await staffAccess();
    const role = access?.role || null;
    const canControlLive = canControl(role);
    const canModerate = role === "owner" || role === "moderator";
    const entryMode: EntryMode =
      body.mode === "stage" && canModerate ? "stage" : "viewer";

    if (action === "start") {
      if (!canControlLive)
        return Response.json(
          { message: "Only a Zoo Crew owner or manager can start the live." },
          { status: 403 },
        );
      const room = await getOrCreateRoom(apiKey, user.id, experience);
      return Response.json({
        isLive: true,
        canControlLive,
        canEndLive: starterId(room, experience) === user.id,
        role,
      });
    }
    if (action === "end") {
      const room = await getRoom(apiKey, experience);
      if (!room || !canControlLive || starterId(room, experience) !== user.id)
        return Response.json(
          { message: "Only the person who started this live can end it." },
          { status: 403 },
        );
      await fetch(`${DAILY_API}/rooms/${room.name}/send-app-message`, {
        method: "POST",
        headers: dailyHeaders(apiKey),
        body: JSON.stringify({ data: { kind: "end-live" }, recipient: "*" }),
      });
      const response = await fetch(`${DAILY_API}/rooms/${room.name}`, {
        method: "DELETE",
        headers: dailyHeaders(apiKey),
      });
      if (!response.ok && response.status !== 404)
        throw new Error("Daily room deletion failed.");
      return Response.json({ isLive: false, canControlLive, role });
    }

    if (action === "gift") {
      if (
        !body.giftId ||
        ![
          "paw",
          "anaconda",
          "lion",
          "black_panther",
          "white_tiger",
          "monkey",
          "money",
          "feed_bag",
          "fly_swatter",
          "hot_dogs",
          "don_anaconda",
          "sha_monkey",
        ].includes(body.giftId) ||
        !body.eventId ||
        !/^[0-9a-f-]{36}$/i.test(body.eventId)
      )
        return Response.json(
          { message: "Invalid test gift." },
          { status: 400 },
        );
      const room = await getRoom(apiKey, experience);
      if (!room)
        return Response.json(
          { message: "The live is offline." },
          { status: 409 },
        );
      const { name } = await memberIdentity(user.id, user.email);
      const response = await fetch(
        `${DAILY_API}/rooms/${room.name}/send-app-message`,
        {
          method: "POST",
          headers: dailyHeaders(apiKey),
          body: JSON.stringify({
            data: {
              kind: "gift",
              giftId: body.giftId,
              eventId: body.eventId,
              senderName: name.slice(0, 50),
              paid: false,
            },
            recipient: "*",
          }),
        },
      );
      if (!response.ok) throw new Error("Daily gift broadcast failed.");
      return Response.json({ sent: true });
    }

    const room = await getRoom(apiKey, experience);
    if (!room)
      return Response.json(
        {
          message: "The Zoo Crew is offline right now.",
          isLive: false,
          canControlLive,
          role,
        },
        { status: 409 },
      );

    const db = serviceConfiguration();
    if (!db)
      return Response.json(
        { message: "Live access checks are not configured." },
        { status: 503 },
      );
    const restrictionQuery = new URLSearchParams({
      select: "expires_at",
      room_id: `eq.${room.name}`,
      user_id: `eq.${user.id}`,
      restriction: "eq.blocked",
    });
    const restrictionResponse = await fetch(
      `${db.url}/rest/v1/zoo_live_room_restrictions?${restrictionQuery}`,
      {
        headers: {
          apikey: db.serviceKey,
          Authorization: `Bearer ${db.serviceKey}`,
        },
        cache: "no-store",
      },
    );
    if (!restrictionResponse.ok)
      throw new Error("Live access restriction check failed.");
    const restrictions = (await restrictionResponse.json()) as {
      expires_at: string | null;
    }[];
    if (
      restrictions.some(
        (restriction) =>
          !restriction.expires_at ||
          new Date(restriction.expires_at).getTime() > Date.now(),
      )
    ) {
      return Response.json(
        { message: "You are blocked from this live room." },
        { status: 403 },
      );
    }

    const {
      name,
      username,
      profileImageUrl: imageUrl,
    } = await memberIdentity(user.id, user.email);
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
    const tokenResponse = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(apiKey),
      body: JSON.stringify({
        properties: {
          room_name: room.name,
          user_id: user.id,
          user_name: name.slice(0, 50),
          is_owner: canModerate,
          permissions: {
            // Staff may enter through the viewer lobby and promote themselves
            // later. Keep their media permission available so that promotion
            // actually enables the camera and microphone controls.
            canSend:
              canModerate || entryMode === "stage" ? ["audio", "video"] : [],
          },
          exp: expires,
        },
      }),
    });
    if (!tokenResponse.ok)
      throw new Error("Daily meeting token creation failed.");
    const token = (await tokenResponse.json()) as { token: string };
    return Response.json({
      roomUrl: `${room.url}?t=${encodeURIComponent(token.token)}`,
      name,
      username,
      profileImageUrl: imageUrl,
      liveStarterUserId: starterId(room, experience),
      isOwner: role === "owner",
      canModerate,
      canControlLive,
      canEndLive: canControlLive && starterId(room, experience) === user.id,
      entryMode,
      role,
    });
  } catch (error) {
    console.error("Live House room error", error);
    return Response.json(
      { message: "The Live House could not open. Please try again." },
      { status: 502 },
    );
  }
}
