import Stripe from "stripe";
import { requirePermission } from "@/lib/stagefront-auth";
import { grantVideoCredits, videoCreditPurchaseReferences } from "@/lib/video-credits";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? new Stripe(key) : null;
}

export async function GET() {
  if (!await requirePermission("finance")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const stripe = stripeClient();
  if (!stripe) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
  const sessions = await stripe.checkout.sessions.list({ limit: 50 });
  const purchases = sessions.data.filter((session) => session.payment_status === "paid" && Number(session.metadata?.video_credits) > 0);
  const references = purchases.map((session) => `stripe:${session.id}`);
  const credited = await videoCreditPurchaseReferences(references);
  return Response.json({
    purchases: purchases.map((session) => ({
      id: session.id,
      email: session.customer_details?.email || session.customer_email || "Unknown customer",
      name: session.customer_details?.name || "",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      credits: Number(session.metadata?.video_credits),
      purchasedAt: new Date(session.created * 1000).toISOString(),
      credited: credited.has(`stripe:${session.id}`),
    })),
  });
}

export async function POST(request: Request) {
  if (!await requirePermission("finance")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const stripe = stripeClient();
  if (!stripe) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) return Response.json({ error: "Invalid checkout reference." }, { status: 400 });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const userId = session.metadata?.stagefront_user_id || session.client_reference_id;
  const credits = Number(session.metadata?.video_credits);
  if (session.payment_status !== "paid" || !userId || !Number.isInteger(credits) || credits < 1) {
    return Response.json({ error: "This is not a valid paid video-credit purchase." }, { status: 422 });
  }
  const balance = await grantVideoCredits(userId, credits, "stripe_purchase", `stripe:${session.id}`, {
    stripe_session_id: session.id,
    payment_intent: session.payment_intent,
    amount_total: session.amount_total,
    currency: session.currency,
    pack: session.metadata?.pack,
    restored_by_owner: true,
  });
  return Response.json({ restored: true, balance });
}
