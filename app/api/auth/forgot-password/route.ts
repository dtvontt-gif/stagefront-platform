import { supabaseConfiguration } from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Password reset is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return Response.json({ message: "Enter your email address." }, { status: 400 });
  const redirectTo = new URL("/reset-password", request.url).toString();
  await fetch(`${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", headers: { apikey: config.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email }),
  });
  return Response.json({ message: "If that email has a StageFront account, a reset link is on its way." });
}

