import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { supabaseAnon } from "./supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/stagefront-auth";

export { ACCESS_COOKIE, REFRESH_COOKIE };
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type KaraokeSession = { user: User; accessToken: string };

export async function karaokeSession(): Promise<KaraokeSession | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const { data, error } = await supabaseAnon().auth.getUser(accessToken);
    if (!error && data.user) return { user: data.user, accessToken };
  }

  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const { data, error } = await supabaseAnon().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) return null;
  try {
    setSessionCookies(store, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  } catch {
    // Server-rendered pages cannot update cookies, but can still use the refreshed
    // session. The studio heartbeat persists it through a route handler.
  }
  return { user: data.user, accessToken: data.session.access_token };
}

export function setSessionCookies(store: Awaited<ReturnType<typeof cookies>>, accessToken: string, refreshToken: string, expiresIn: number) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  store.set(ACCESS_COOKIE, accessToken, { ...options, maxAge: expiresIn });
  store.set(REFRESH_COOKIE, refreshToken, { ...options, maxAge: SESSION_MAX_AGE });
}
