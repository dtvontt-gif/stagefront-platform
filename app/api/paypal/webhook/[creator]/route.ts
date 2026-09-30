import { isSuperfanCreator, verifyPayPalWebhook } from "@/lib/paypal";
import { serviceConfiguration } from "@/lib/stagefront-auth";

export const runtime = "nodejs";

type PayPalEvent = {
  id?: string;
  event_type?: string;
  resource?: { id?: string; custom_id?: string; status?: string };
};

const eventStatuses: Record<string, string> = {
  "BILLING.SUBSCRIPTION.ACTIVATED": "active",
  "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
  "BILLING.SUBSCRIPTION.EXPIRED": "expired",
  "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
};

export async function POST(request: Request, { params }: RouteContext<"/api/paypal/webhook/[creator]">) {
  const { creator } = await params;
  if (!isSuperfanCreator(creator)) return new Response("Unknown creator.", { status: 404 });
  const rawBody = await request.text();
  const event = JSON.parse(rawBody) as PayPalEvent;
  if (!(await verifyPayPalWebhook(request, event, creator))) return new Response("Invalid PayPal signature.", { status: 400 });

  const subscriptionId = event.resource?.id;
  const status = eventStatuses[event.event_type ?? ""] || event.resource?.status?.toLowerCase();
  if (!subscriptionId || !status) return Response.json({ received: true });

  const database = serviceConfiguration();
  if (!database) return new Response("Database unavailable.", { status: 503 });
  const query = new URLSearchParams({ paypal_subscription_id: `eq.${subscriptionId}`, creator: `eq.${creator}` });
  const response = await fetch(`${database.url}/rest/v1/superfan_subscriptions?${query}`, {
    method: "PATCH",
    headers: {
      apikey: database.serviceKey,
      Authorization: `Bearer ${database.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status,
      paypal_event_id: event.id ?? null,
      activated_at: status === "active" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) return new Response("Membership update failed; PayPal should retry.", { status: 500 });
  return Response.json({ received: true });
}
