import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

export const runtime = "nodejs";
const DAILY_API = "https://api.daily.co/v1";
const ROOM_PREFIX = "zoo-crew-vibe-live-";
const COSTS = { paw: 10, anaconda: 300, lion: 1000 } as const;
type GiftId = keyof typeof COSTS;

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ message: "Sign in before sending gifts." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { giftId?: string; eventId?: string; senderName?: string };
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
    const senderName = String(body.senderName || user.email?.split("@")[0] || "Zoo Crew fan").trim().slice(0, 50) || "Zoo Crew fan";
    const broadcast = await fetch(DAILY_API + "/rooms/" + encodeURIComponent(room.name) + "/send-app-message", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { kind: "gift", giftId, eventId: body.eventId, senderName }, recipient: "*" }),
    });
    if (!broadcast.ok) {
      console.error("Paid Zoo gift was charged but its animation broadcast failed", { eventId: body.eventId, status: broadcast.status });
      return Response.json({ message: "Coins were charged, but the animation did not reach the live. Contact a Zoo Crew owner with event ID " + body.eventId + ".", eventId: body.eventId, balance }, { status: 502 });
    }
    return Response.json({ sent: true, balance, coinsSpent: COSTS[giftId] });
  } catch (error) {
    console.error("Paid Zoo gift failed", error);
    return Response.json({ message: "Gift could not be sent." }, { status: 502 });
  }
}
