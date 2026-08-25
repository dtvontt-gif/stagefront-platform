import Stripe from "stripe";
import { grantVideoCredits } from "@/lib/video-credits";

export const runtime = "nodejs";

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.stagefront_user_id || session.client_reference_id;
  const credits = Number(session.metadata?.video_credits);
  if (session.payment_status !== "paid" || !userId || !Number.isInteger(credits) || credits < 1) return;
  await grantVideoCredits(userId, credits, "stripe_purchase", `stripe:${session.id}`, {
    stripe_session_id: session.id,
    payment_intent: session.payment_intent,
    amount_total: session.amount_total,
    currency: session.currency,
    pack: session.metadata?.pack,
  });
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret || !signature) return new Response("Webhook is not configured.", { status: 503 });

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature failed", error);
    return new Response("Invalid webhook signature.", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    try {
      await fulfillCheckout(event.data.object);
    } catch (error) {
      console.error("Stripe video-credit fulfillment failed", {
        eventId: event.id,
        sessionId: event.data.object.id,
        error: error instanceof Error ? error.message : "Unknown fulfillment error",
      });
      return new Response("Credit fulfillment failed; Stripe should retry.", { status: 500 });
    }
  }

  return Response.json({ received: true });
}
