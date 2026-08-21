import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { supabaseAnon } from "./supabase";

export const ACCESS_COOKIE = "sf_karaoke_access";

export type KaraokeSession = { user: User; accessToken: string };

export async function karaokeSession(): Promise<KaraokeSession | null> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  const { data, error } = await supabaseAnon().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { user: data.user, accessToken };
}
