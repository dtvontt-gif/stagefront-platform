import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSessionCookies } from "@/lib/karaoke-v2/auth";
import { supabaseAnon } from "@/lib/karaoke-v2/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
  if (error || !data.session) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });

  const store = await cookies();
  setSessionCookies(store, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  return NextResponse.json({ ok: true });
}
