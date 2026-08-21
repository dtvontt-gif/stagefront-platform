import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/karaoke-v2/auth";

export async function POST() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  return NextResponse.json({ ok: true });
}
