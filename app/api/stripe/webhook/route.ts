import Stripe from "stripe";
import { grantVideoCredits } from "@/lib/video-credits";

export const runtime = "nodejs";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.stagefront_user_id || session.client_reference_id;
    const credits = Number(session.metadata?.video_credits);
    if (session.payment_status === "paid" && userId && Number.isInteger(credits) && credits > 0) {
      await grantVideoCredits(userId, credits, "stripe_purchase", `stripe:${session.id}`, {
        stripe_session_id: session.id,
        payment_intent: session.payment_intent,
        amount_total: session.amount_total,
        currency: session.currency,
        pack: session.metadata?.pack,
      });
    }
  }

  return Response.json({ received: true });
}
