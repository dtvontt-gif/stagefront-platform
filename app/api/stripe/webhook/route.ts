import Stripe from "stripe";
import { grantVideoCredits } from "@/lib/video-credits";
import { grantZooCoins } from "@/lib/zoo-coins";

export const runtime = "nodejs";

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const userId =
    session.metadata?.stagefront_user_id || session.client_reference_id;
  if (session.payment_status === "unpaid" || !userId) return;

  if (session.metadata?.purchase_kind === "zoo_coins") {
    const coins = Number(session.metadata.zoo_coins);
    const amountCents = Number(session.amount_total);
    if (
      !Number.isInteger(coins) ||
      coins < 1 ||
      !Number.isInteger(amountCents) ||
      amountCents < 1
    )
      return;
    await grantZooCoins(userId, coins, session.id, amountCents);
    return;
  }

  const credits = Number(session.metadata?.video_credits);
  if (!Number.isInteger(credits) || credits < 1) return;
  await grantVideoCredits(
    userId,
    credits,
    "stripe_purchase",
    `stripe:${session.id}`,
    {
      stripe_session_id: session.id,
      payment_intent: session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      pack: session.metadata?.pack,
    },
  );
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret || !signature)
    return new Response("Webhook is not configured.", { status: 503 });

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature failed", error);
    return new Response("Invalid webhook signature.", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      await fulfillCheckout(event.data.object);
    } catch (error) {
      console.error("Stripe checkout fulfillment failed", {
        eventId: event.id,
        sessionId: event.data.object.id,
        error:
          error instanceof Error ? error.message : "Unknown fulfillment error",
      });
      return new Response("Credit fulfillment failed; Stripe should retry.", {
        status: 500,
      });
    }
  }

  return Response.json({ received: true });
}
