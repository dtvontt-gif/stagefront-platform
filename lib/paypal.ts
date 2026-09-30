export type SuperfanCreator = "don" | "unk";

type PayPalConfiguration = {
  clientId: string;
  clientSecret: string;
  planId: string;
  webhookId?: string;
  apiBase: string;
};

export function isSuperfanCreator(value: unknown): value is SuperfanCreator {
  return value === "don" || value === "unk";
}

export function paypalConfiguration(creator: SuperfanCreator): PayPalConfiguration | null {
  const prefix = creator === "don" ? "PAYPAL_DON" : "PAYPAL_UNK";
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  const planId = process.env[`${prefix}_PLAN_ID`]?.trim();
  const webhookId = process.env[`${prefix}_WEBHOOK_ID`]?.trim();
  if (!clientId || !clientSecret || !planId) return null;
  return {
    clientId,
    clientSecret,
    planId,
    webhookId,
    apiBase: process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

export async function paypalAccessToken(configuration: PayPalConfiguration) {
  const credentials = Buffer.from(`${configuration.clientId}:${configuration.clientSecret}`).toString("base64");
  const response = await fetch(`${configuration.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "PayPal authentication failed.");
  return result.access_token;
}

export async function verifyPayPalWebhook(request: Request, event: unknown, creator: SuperfanCreator) {
  const configuration = paypalConfiguration(creator);
  if (!configuration?.webhookId) return false;
  const accessToken = await paypalAccessToken(configuration);
  const payload = {
    auth_algo: request.headers.get("paypal-auth-algo"),
    cert_url: request.headers.get("paypal-cert-url"),
    transmission_id: request.headers.get("paypal-transmission-id"),
    transmission_sig: request.headers.get("paypal-transmission-sig"),
    transmission_time: request.headers.get("paypal-transmission-time"),
    webhook_id: configuration.webhookId,
    webhook_event: event,
  };
  if (Object.values(payload).some((value) => !value)) return false;
  const response = await fetch(`${configuration.apiBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await response.json() as { verification_status?: string };
  return response.ok && result.verification_status === "SUCCESS";
}
