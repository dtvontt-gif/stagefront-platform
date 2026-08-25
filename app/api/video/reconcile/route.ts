import Stripe from "stripe";
import { authenticatedUser } from "@/lib/stagefront-auth";
import { grantVideoCredits } from "@/lib/video-credits";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Sign in to confirm this purchase." }, { status: 401 });
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return Response.json({ error: "Checkout confirmation is unavailable." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ error: "That checkout reference is invalid." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const purchaserId = session.metadata?.stagefront_user_id || session.client_reference_id;
  const credits = Number(session.metadata?.video_credits);
  if (purchaserId !== user.id) return Response.json({ error: "This purchase belongs to a different account." }, { status: 403 });
  if (session.payment_status !== "paid") return Response.json({ pending: true }, { status: 202 });
  if (!Number.isInteger(credits) || credits < 1) return Response.json({ error: "This purchase has invalid credit details." }, { status: 422 });

  const balance = await grantVideoCredits(user.id, credits, "stripe_purchase", `stripe:${session.id}`, {
    stripe_session_id: session.id,
    payment_intent: session.payment_intent,
    amount_total: session.amount_total,
    currency: session.currency,
    pack: session.metadata?.pack,
    reconciled_on_return: true,
  });
  return Response.json({ credited: true, balance });
}
