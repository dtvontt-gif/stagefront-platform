import { supabaseConfiguration } from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Password reset is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { accessToken?: unknown; password?: unknown } | null;
  const token = typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || password.length < 8) return Response.json({ message: "Use a password with at least 8 characters." }, { status: 400 });
  const response = await fetch(`${config.url}/auth/v1/user`, { method: "PUT", headers: { apikey: config.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) return Response.json({ message: "This reset link is invalid or expired. Request another one." }, { status: 400 });
  return Response.json({ message: "Password updated. You can now sign in to StageFront." });
}
