import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, setSessionCookies } from "@/lib/karaoke-v2/auth";
import { supabaseAnon } from "@/lib/karaoke-v2/supabase";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await supabaseAnon().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
  setSessionCookies(store, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  return NextResponse.json({ ok: true });
}
