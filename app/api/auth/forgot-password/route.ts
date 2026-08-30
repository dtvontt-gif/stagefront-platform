import { supabaseConfiguration } from "@/lib/stagefront-auth";

const GENERIC_MESSAGE = "If that email has a StageFront account, a reset link is on its way.";

function recoveryRedirect(request: Request) {
  const configuredUrl = process.env.STAGEFRONT_SITE_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return new URL("/reset-password", url).toString();
      }
    } catch {
      // Fall back to the public request origin when the optional setting is invalid.
    }
  }
  return new URL("/reset-password", request.url).toString();
}

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Password reset is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return Response.json({ message: "Enter your email address." }, { status: 400 });
  const redirectTo = recoveryRedirect(request);
  const response = await fetch(`${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", headers: { apikey: config.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    console.error("Supabase password recovery request failed", response.status, { redirectTo });
  }
  return Response.json({ message: GENERIC_MESSAGE });
}
