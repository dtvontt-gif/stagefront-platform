import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_MAX_AGE,
  supabaseConfiguration,
} from "@/lib/stagefront-auth";

function tokenNeedsRefresh(token?: string) {
  if (!token) return true;
  try {
    const encoded = token.split(".")[1];
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + 60;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!refreshToken || !tokenNeedsRefresh(accessToken)) return NextResponse.next();

  const config = supabaseConfiguration();
  if (!config) return NextResponse.next();
  const refreshResponse = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!refreshResponse.ok) return NextResponse.next();

  const session = (await refreshResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!session.access_token || !session.refresh_token) return NextResponse.next();

  request.cookies.set(ACCESS_COOKIE, session.access_token);
  request.cookies.set(REFRESH_COOKIE, session.refresh_token);
  const response = NextResponse.next({ request });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...options,
    maxAge: session.expires_in ?? 3600,
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...options,
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3|wav)$).*)"],
};
