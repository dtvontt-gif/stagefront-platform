import { serviceConfiguration, supabaseConfiguration } from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Account creation is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    username?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().replace(/^@/, "").toLowerCase() : "";
  if (!email || password.length < 8 || displayName.length < 2 || !/^[a-z0-9_]{3,24}$/.test(username)) {
    return Response.json(
      { message: "Use a valid email and a password with at least 8 characters." },
      { status: 400 },
    );
  }

  const confirmationUrl = new URL("/sign-in?confirmed=1", request.url).toString();
  const signupUrl = new URL(`${config.url}/auth/v1/signup`);
  signupUrl.searchParams.set("redirect_to", confirmationUrl);

  const response = await fetch(signupUrl, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { display_name: displayName, username } }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    msg?: string;
    error_description?: string;
  };
  if (!response.ok) {
    return Response.json(
      { message: result.msg ?? result.error_description ?? "Account creation failed." },
      { status: response.status },
    );
  }
  const userId = (result as { user?: { id?: string } }).user?.id;
  const service = serviceConfiguration();
  if (userId && service) {
    const created = await fetch(`${service.url}/rest/v1/stagefront_profiles`, {
      method: "POST",
      headers: { apikey: service.serviceKey, Authorization: `Bearer ${service.serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: userId, email, display_name: displayName, username }),
    });
    if (!created.ok) return Response.json({ message: "That username is already being used." }, { status: 409 });
  }
  return Response.json({
    message: "Account created. Check your email to confirm it, then sign in.",
  });
}
