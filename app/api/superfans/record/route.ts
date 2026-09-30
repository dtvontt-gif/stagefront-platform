import { donPayPalSubscription } from "@/lib/paypal-public";
import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ error: "Sign in before becoming a Superfan." }, { status: 401 });

  const body = await request.json().catch(() => null) as { creator?: unknown; subscriptionId?: unknown } | null;
  if (body?.creator !== "don") return Response.json({ error: "This PayPal plan is only connected to Don." }, { status: 400 });
  if (typeof body.subscriptionId !== "string" || !/^I-[A-Z0-9]+$/i.test(body.subscriptionId)) {
    return Response.json({ error: "PayPal returned an invalid subscription number." }, { status: 400 });
  }

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
      creator: "don",
      paypal_subscription_id: body.subscriptionId,
      paypal_plan_id: donPayPalSubscription.planId,
      status: "approval_pending",
    }),
  });
  if (!saved.ok) return Response.json({ error: "PayPal approved the subscription, but StageFront could not record it." }, { status: 502 });
  return Response.json({ ok: true });
}
