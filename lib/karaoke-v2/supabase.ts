import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const KARAOKE_SOURCE_BUCKET = "karaoke-v2-source";
export const KARAOKE_STEMS_BUCKET = "karaoke-v2-stems";
export const KARAOKE_RENDERS_BUCKET = "karaoke-v2-renders";
export const KARAOKE_BACKGROUNDS_BUCKET = "karaoke-v2-backgrounds";

function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function supabaseConfiguration() {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = isHttpUrl(publicUrl) ? publicUrl : process.env.SUPABASE_URL?.trim();
  const anonKey = isHttpUrl(publicUrl)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    : process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

export function supabaseAnon(): SupabaseClient {
  const { url, anonKey } = supabaseConfiguration();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function supabaseForUser(accessToken: string): SupabaseClient {
  const { url, anonKey } = supabaseConfiguration();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function supabaseService(): SupabaseClient {
  const { url } = supabaseConfiguration();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("Supabase service access is not configured.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function isAuthorizedWorker(request: Request) {
  const expected = process.env.KARAOKE_WORKER_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}
