import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

export const runtime = "nodejs";
const DAILY_API = "https://api.daily.co/v1";
const ROOM_PREFIX = "zoo-crew-vibe-live-";
const COSTS = { paw: 10, anaconda: 300, lion: 1000 } as const;
type GiftId = keyof typeof COSTS;

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}

async function refundGift(db: NonNullable<ReturnType<typeof serviceConfiguration>>, userId: string, eventId: string) {
  return fetch(db.url + "/rest/v1/rpc/zoo_live_refund_gift_coins", {
    method: "POST",
    headers: serviceHeaders(db.serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_event_id: eventId }),
  });
}

async function verifiedSenderName(db: NonNullable<ReturnType<typeof serviceConfiguration>>, userId: string) {
  const query = new URLSearchParams({ select: "display_name,username", user_id: "eq." + userId, limit: "1" });
  const response = await fetch(db.url + "/rest/v1/stagefront_profiles?" + query, {
    headers: serviceHeaders(db.serviceKey), cache: "no-store",
  });
  if (!response.ok) return "Zoo Crew fan";
  const [profile] = await response.json() as { display_name?: string; username?: string }[];
  return (profile?.display_name || profile?.username || "Zoo Crew fan").trim().slice(0, 50) || "Zoo Crew fan";
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ message: "Sign in before sending gifts." }, { status: 401 });
  if (process.env.ZOO_LIVE_PAID_GIFTS_ENABLED !== "true") return Response.json({ message: "Paid Zoo Crew gifts are not enabled yet." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { giftId?: string; eventId?: string };
  if (!(body.giftId && body.giftId in COSTS) || !body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId)) {
    return Response.json({ message: "Invalid gift request." }, { status: 400 });
  }
  const giftId = body.giftId as GiftId;
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const db = serviceConfiguration();
  if (!apiKey || !db) return Response.json({ message: "Live gifts are not configured." }, { status: 503 });

  try {
    const roomsResponse = await fetch(DAILY_API + "/rooms?limit=100", {
      headers: { Authorization: "Bearer " + apiKey }, cache: "no-store",
    });
    if (!roomsResponse.ok) throw new Error("Live room lookup failed.");
    const rooms = (await roomsResponse.json() as { data?: { name: string; url: string }[] }).data || [];
    const room = rooms.find((item) => item.name.startsWith(ROOM_PREFIX));
    if (!room) return Response.json({ message: "The live is offline." }, { status: 409 });

    const spend = await fetch(db.url + "/rest/v1/rpc/zoo_live_spend_gift_coins", {
      method: "POST",
      headers: { apikey: db.serviceKey, Authorization: "Bearer " + db.serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: user.id, p_gift_id: giftId, p_event_id: body.eventId, p_room_id: room.name }),
    });
    if (!spend.ok) {
      const errorText = await spend.text();
      return Response.json({ message: errorText.includes("Insufficient coins") ? "Not enough coins for that gift." : "Gift could not be charged." }, { status: errorText.includes("Insufficient coins") ? 409 : 502 });
    }
    const balance = Number(await spend.json());
    const senderName = await verifiedSenderName(db, user.id);
    let broadcast: Response | null = null;
    try {
      broadcast = await fetch(DAILY_API + "/rooms/" + encodeURIComponent(room.name) + "/send-app-message", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ data: { kind: "gift", giftId, eventId: body.eventId, senderName }, recipient: "*" }),
      });
    } catch (error) {
      console.error("Zoo gift animation request failed", error);
    }
    if (!broadcast?.ok) {
      const refund = await refundGift(db, user.id, body.eventId);
      if (refund.ok) {
        const newBalance = Number(await refund.json());
        return Response.json({ message: "The gift did not reach the live, so the coins were returned.", eventId: body.eventId, balance: newBalance }, { status: 502 });
      }
      console.error("Zoo gift failed and automatic refund could not be confirmed", { eventId: body.eventId, status: broadcast?.status });
      return Response.json({ message: "Gift delivery failed and the automatic refund could not be confirmed. Contact a Zoo Crew owner with event ID " + body.eventId + ".", eventId: body.eventId, balance }, { status: 502 });
    }
    return Response.json({ sent: true, balance, coinsSpent: COSTS[giftId] });
  } catch (error) {
    console.error("Paid Zoo gift failed", error);
    return Response.json({ message: "Gift could not be sent." }, { status: 502 });
  }
}
