import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const KARAOKE_SOURCE_BUCKET = "karaoke-v2-source";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

export function supabaseAnon(): SupabaseClient {
  const { url, anonKey } = config();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function supabaseForUser(accessToken: string): SupabaseClient {
  const { url, anonKey } = config();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
