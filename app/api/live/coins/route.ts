import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { paypalAccessToken, paypalConfiguration } from "@/lib/paypal";

export const runtime = "nodejs";
const PACKAGES: Record<string, { amountCents: number; coins: number }> = {
  "5": { amountCents: 500, coins: 500 },
  "10": { amountCents: 1000, coins: 1000 },
  "20": { amountCents: 2000, coins: 2000 },
};
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
  const response = await fetch(
    db.url + "/rest/v1/zoo_live_coin_wallets?" + query,
    { headers: headers(db.serviceKey), cache: "no-store" },
  );
  if (!response.ok)
    return Response.json(
      { message: "Coin balance could not be loaded." },
      { status: 502 },
    );
  const [wallet] = (await response.json()) as { balance_coins: number }[];
  return Response.json({
    balance: Number(wallet?.balance_coins || 0),
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
  const pack = PACKAGES[String(body.package || "")];
  if (!pack)
    return Response.json(
      { message: "Choose a listed coin package." },
      { status: 400 },
    );
  const db = serviceConfiguration();
  const paypal = paypalConfiguration("don");
  if (!db || !paypal)
    return Response.json(
      { message: "PayPal coin purchases are not configured yet." },
      { status: 503 },
    );

  try {
    const accessToken = await paypalAccessToken(paypal);
    const orderResponse = await fetch(paypal.apiBase + "/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: user.id,
            description: "Zoo Crew Live Coins (" + pack.coins + ")",
            amount: {
              currency_code: "USD",
              value: (pack.amountCents / 100).toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "Zoo Crew Vibe",
          user_action: "PAY_NOW",
          return_url: `https://www.stagefrontdtv.com/api/live/coins/capture?returnTo=${body.returnTo === "profile" ? "profile" : "live"}`,
          cancel_url: `https://www.stagefrontdtv.com/${body.returnTo === "profile" ? "profile" : "live"}?coins=cancelled`,
        },
      }),
      cache: "no-store",
    });
    const order = (await orderResponse.json()) as {
      id?: string;
      links?: { rel: string; href: string }[];
    };
    if (!orderResponse.ok || !order.id)
      throw new Error("PayPal could not create the order.");
    const approvalUrl = order.links?.find(
      (link) => link.rel === "approve",
    )?.href;
    if (!approvalUrl)
      throw new Error("PayPal did not return an approval link.");
    const insert = await fetch(db.url + "/rest/v1/zoo_live_coin_purchases", {
      method: "POST",
      headers: { ...headers(db.serviceKey), Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        paypal_order_id: order.id,
        amount_cents: pack.amountCents,
        coins: pack.coins,
      }),
      cache: "no-store",
    });
    if (!insert.ok)
      throw new Error("The pending coin order could not be saved.");
    return Response.json({
      approvalUrl,
      coins: pack.coins,
      amountCents: pack.amountCents,
    });
  } catch (error) {
    console.error("Zoo coin order creation failed", error);
    return Response.json(
      { message: "PayPal order could not be created." },
      { status: 502 },
    );
  }
}
