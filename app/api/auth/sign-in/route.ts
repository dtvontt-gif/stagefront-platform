import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  isAdministrator,
  supabaseConfiguration,
} from "@/lib/stagefront-auth";

export async function POST(request: Request) {
  const config = supabaseConfiguration();
  if (!config) return Response.json({ message: "Sign-in is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    next?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const requestedDestination =
    typeof body?.next === "string" &&
    body.next.startsWith("/") &&
    !body.next.startsWith("//")
      ? body.next
      : null;
  if (!email || password.length < 8) {
    return Response.json({ message: "Enter your email and password." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    return Response.json({ message: "The email or password was not recognized." }, { status: 401 });
  }

  const session = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    user?: { email?: string };
  };
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: session.expires_in ?? 3600,
  });
  store.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({
    message: "Welcome back to StageFront.",
    destination:
      requestedDestination ??
      (isAdministrator(session.user?.email) ? "/admin" : "/"),
  });
}
