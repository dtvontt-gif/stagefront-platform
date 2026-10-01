import { donPayPalSubscription } from "@/lib/paypal-public";
import { paypalAccessToken, paypalConfiguration } from "@/lib/paypal";
import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

export const runtime = "nodejs";

type PayPalSubscription = {
  id?: string;
  plan_id?: string;
  custom_id?: string;
  status?: string;
};

async function liveSubscription(subscriptionId: string) {
  const paypal = paypalConfiguration("don");
  if (!paypal) throw new Error("PayPal is not connected.");
  const accessToken = await paypalAccessToken(paypal);
  const response = await fetch(`${paypal.apiBase}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const subscription = await response.json() as PayPalSubscription;
  if (!response.ok) throw new Error("PayPal could not verify the subscription.");
  return subscription;
}

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
  const subscription = await liveSubscription(body.subscriptionId);
  if (subscription.plan_id !== donPayPalSubscription.planId || subscription.custom_id !== user.id) {
    return Response.json({ error: "The PayPal subscription does not match this StageFront account." }, { status: 400 });
  }
  const status = subscription.status?.toLowerCase() || "approval_pending";
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
      status,
      activated_at: status === "active" ? new Date().toISOString() : null,
    }),
  });
  if (!saved.ok) return Response.json({ error: "PayPal approved the subscription, but StageFront could not record it." }, { status: 502 });
  return Response.json({ ok: true });
}

export async function PUT() {
  const user = await authenticatedUser();
  if (!user?.email) return Response.json({ error: "Sign in before refreshing membership." }, { status: 401 });
  const database = serviceConfiguration();
  if (!database) return Response.json({ error: "The Superfan database is not connected." }, { status: 503 });
  const headers = { apikey: database.serviceKey, Authorization: `Bearer ${database.serviceKey}` };
  const query = new URLSearchParams({ select: "paypal_subscription_id,status", user_id: `eq.${user.id}`, creator: "eq.don" });
  const pendingResponse = await fetch(`${database.url}/rest/v1/superfan_subscriptions?${query}`, { headers, cache: "no-store" });
  if (!pendingResponse.ok) return Response.json({ error: "StageFront could not find the membership." }, { status: 502 });
  const rows = await pendingResponse.json() as { paypal_subscription_id: string; status: string }[];
  let active = false;
  for (const row of rows) {
    if (row.status === "active") { active = true; continue; }
    const subscription = await liveSubscription(row.paypal_subscription_id);
    if (subscription.plan_id !== donPayPalSubscription.planId || subscription.custom_id !== user.id) continue;
    const status = subscription.status?.toLowerCase() || row.status;
    const updateQuery = new URLSearchParams({ paypal_subscription_id: `eq.${row.paypal_subscription_id}`, user_id: `eq.${user.id}` });
    await fetch(`${database.url}/rest/v1/superfan_subscriptions?${updateQuery}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status, activated_at: status === "active" ? new Date().toISOString() : undefined, updated_at: new Date().toISOString() }),
    });
    if (status === "active") active = true;
  }
  return Response.json({ ok: true, active });
}
