import { supabaseConfiguration } from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Account creation is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || password.length < 8) {
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
    body: JSON.stringify({ email, password }),
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
  return Response.json({
    message: "Account created. Check your email to confirm it, then sign in.",
  });
}
