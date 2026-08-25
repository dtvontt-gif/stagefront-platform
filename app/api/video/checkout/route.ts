import Stripe from "stripe";
import { authenticatedUser } from "@/lib/stagefront-auth";
import { VIDEO_PACKS, type VideoPackId } from "@/lib/video-credits";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ error: "Sign in before purchasing video credits." }, { status: 401 });
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return Response.json({ error: "Video credit checkout is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { pack?: unknown } | null;
  const packId = typeof body?.pack === "string" ? body.pack as VideoPackId : "";
  const pack = VIDEO_PACKS[packId as VideoPackId];
  if (!pack) return Response.json({ error: "Choose a valid video credit package." }, { status: 400 });

  const origin = process.env.STAGEFRONT_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    integration_identifier: "stagefront_video_qnzrftka",
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    success_url: `${origin}/create/video?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/create/video?checkout=cancelled`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: pack.amount,
        product_data: {
          name: `StageFront ${pack.label}`,
          description: "One credit creates one AI video of any available length.",
        },
      },
    }],
    metadata: { stagefront_user_id: user.id, video_credits: String(pack.credits), pack: packId },
    payment_intent_data: { metadata: { stagefront_user_id: user.id, video_credits: String(pack.credits), pack: packId } },
    allow_promotion_codes: false,
  });

  if (!session.url) return Response.json({ error: "Stripe did not return a checkout page." }, { status: 502 });
  return Response.json({ url: session.url });
}
