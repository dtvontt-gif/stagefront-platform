import { cookies } from "next/headers";

export const ACCESS_COOKIE = "stagefront_access_token";
export const REFRESH_COOKIE = "stagefront_refresh_token";

type SupabaseUser = { id: string; email?: string };

export function supabaseConfiguration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function serviceConfiguration() {
  const base = supabaseConfiguration();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && serviceKey ? { ...base, serviceKey } : null;
}

export function isAdministrator(email?: string) {
  const admins = new Set(
    (process.env.STAGEFRONT_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return Boolean(email && admins.has(email.toLowerCase()));
}

export async function authenticatedUser(): Promise<SupabaseUser | null> {
  const config = supabaseConfiguration();
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!config || !token) return null;

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return response.ok ? ((await response.json()) as SupabaseUser) : null;
}

export async function requireAdministrator() {
  const user = await authenticatedUser();
  return user && isAdministrator(user.email) ? user : null;
}
