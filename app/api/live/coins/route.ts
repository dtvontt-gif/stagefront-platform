import Stripe from "stripe";
import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { ZOO_COIN_PACKS, type ZooCoinPackId } from "@/lib/zoo-coins";

export const runtime = "nodejs";
function headers(key: string) {
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user)
    return Response.json(
      { message: "Sign in to see your Zoo Crew coin balance." },
      { status: 401 },
    );
  const db = serviceConfiguration();
  if (!db)
    return Response.json(
      { message: "Coin wallet is not configured." },
      { status: 503 },
    );
  const query = new URLSearchParams({
    select: "balance_coins",
    user_id: "eq." + user.id,
    limit: "1",
  });
  const [response, giftPointsResponse] = await Promise.all([
    fetch(db.url + "/rest/v1/zoo_live_coin_wallets?" + query, {
      headers: headers(db.serviceKey),
      cache: "no-store",
    }),
    fetch(db.url + "/rest/v1/rpc/zoo_live_gift_points", {
      method: "POST",
      headers: headers(db.serviceKey),
      body: "{}",
      cache: "no-store",
    }),
  ]);
  if (!response.ok)
    return Response.json(
      { message: "Coin balance could not be loaded." },
      { status: 502 },
    );
  const [wallet] = (await response.json()) as { balance_coins: number }[];
  const giftPoints = giftPointsResponse.ok
    ? Number(await giftPointsResponse.json())
    : 0;
  return Response.json({
    balance: Number(wallet?.balance_coins || 0),
    giftPoints,
    coinsPerDollar: 100,
    enabled: process.env.ZOO_LIVE_PAID_GIFTS_ENABLED === "true",
  });
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user)
    return Response.json(
      { message: "Sign in before buying coins." },
      { status: 401 },
    );
  if (process.env.ZOO_LIVE_PAID_GIFTS_ENABLED !== "true")
    return Response.json(
      { message: "Paid Zoo Crew gifts are not enabled yet." },
      { status: 503 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    package?: string;
    returnTo?: string;
  };
  const packId = String(body.package || "") as ZooCoinPackId;
  const pack = ZOO_COIN_PACKS[packId];
  if (!pack)
    return Response.json(
      { message: "Choose a listed coin package." },
      { status: 400 },
    );
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey)
    return Response.json(
      { message: "Stripe coin purchases are not configured yet." },
      { status: 503 },
    );

  try {
    const destination = body.returnTo === "profile" ? "/profile" : "/live";
    const origin =
      process.env.STAGEFRONT_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      integration_identifier: "stagefront_zoo_coins_mqkfrtaz",
      mode: "payment",
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      success_url: `${origin}${destination}?coins=processing`,
      cancel_url: `${origin}${destination}?coins=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: pack.label,
              description: "Zoo Coins for gifts in Zoo Crew live rooms.",
            },
          },
        },
      ],
      metadata: {
        purchase_kind: "zoo_coins",
        stagefront_user_id: user.id,
        zoo_coin_pack: packId,
        zoo_coins: String(pack.coins),
      },
      payment_intent_data: {
        metadata: {
          purchase_kind: "zoo_coins",
          stagefront_user_id: user.id,
          zoo_coin_pack: packId,
          zoo_coins: String(pack.coins),
        },
      },
      allow_promotion_codes: false,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return Response.json({
      approvalUrl: session.url,
      coins: pack.coins,
      amountCents: pack.amountCents,
    });
  } catch (error) {
    console.error("Zoo coin order creation failed", error);
    return Response.json(
      { message: "Stripe checkout could not be created." },
      { status: 502 },
    );
  }
}
