import { randomUUID } from "node:crypto";
import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { isSuperfanCreator, paypalAccessToken, paypalConfiguration } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ error: "Sign in before becoming a Superfan." }, { status: 401 });

  const body = await request.json().catch(() => null) as { creator?: unknown } | null;
  if (!isSuperfanCreator(body?.creator)) return Response.json({ error: "Choose Don or Unk." }, { status: 400 });
  const creator = body.creator;
  const paypal = paypalConfiguration(creator);
  if (!paypal) return Response.json({ error: `${creator === "don" ? "Don's" : "Unk's"} PayPal subscription is not connected yet.` }, { status: 503 });

  const accessToken = await paypalAccessToken(paypal);
  const origin = process.env.STAGEFRONT_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const response = await fetch(`${paypal.apiBase}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
    },
    body: JSON.stringify({
      plan_id: paypal.planId,
      custom_id: user.id,
      subscriber: { email_address: user.email },
      application_context: {
        brand_name: "Zoo Crew Vibe on StageFront",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${origin}/?superfan=approved#superfans`,
        cancel_url: `${origin}/?superfan=cancelled#superfans`,
      },
    }),
    cache: "no-store",
  });
  const result = await response.json() as { id?: string; links?: { href: string; rel: string }[]; message?: string };
  const approvalUrl = result.links?.find((link) => link.rel === "approve")?.href;
  if (!response.ok || !result.id || !approvalUrl) return Response.json({ error: result.message || "PayPal could not create the subscription." }, { status: 502 });

  const database = serviceConfiguration();
  if (!database) return Response.json({ error: "The Superfan database is not connected." }, { status: 503 });
  const saved = await fetch(`${database.url}/rest/v1/superfan_subscriptions?on_conflict=paypal_subscription_id`, {
    method: "POST",
    headers: {
      apikey: database.serviceKey,
      Authorization: `Bearer ${database.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: user.id,
      supporter_email: user.email.toLowerCase(),
      creator,
      paypal_subscription_id: result.id,
      paypal_plan_id: paypal.planId,
      status: "approval_pending",
    }),
  });
  if (!saved.ok) return Response.json({ error: "PayPal opened, but StageFront could not save the membership. Please try again." }, { status: 502 });
  return Response.json({ approvalUrl });
}
