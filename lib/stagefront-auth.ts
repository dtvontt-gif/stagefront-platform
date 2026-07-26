import { cookies } from "next/headers";

export const ACCESS_COOKIE = "stagefront_access_token";
export const REFRESH_COOKIE = "stagefront_refresh_token";

type SupabaseUser = { id: string; email?: string };
export type StaffRole = "owner" | "manager" | "moderator";
export type StaffPermission = "staff" | "finance" | "profiles" | "hosts" | "queue" | "contests";

const rolePermissions: Record<StaffRole, StaffPermission[]> = {
  owner: ["staff", "finance", "profiles", "hosts", "queue", "contests"],
  manager: ["profiles", "hosts", "queue", "contests"],
  moderator: ["queue", "contests"],
};

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
  const access = await staffAccess();
  return access ? access.user : null;
}

export async function staffAccess(): Promise<{ user: SupabaseUser; role: StaffRole; permissions: StaffPermission[] } | null> {
  const user = await authenticatedUser();
  if (!user?.email) return null;
  if (isAdministrator(user.email)) return { user, role: "owner", permissions: rolePermissions.owner };
  const config = serviceConfiguration();
  if (!config) return null;
  const query = new URLSearchParams({ select: "role,active", email: `eq.${user.email.toLowerCase()}`, limit: "1" });
  const response = await fetch(`${config.url}/rest/v1/stagefront_staff?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const [record] = (await response.json()) as { role: StaffRole; active: boolean }[];
  if (!record?.active || !rolePermissions[record.role]) return null;
  return { user, role: record.role, permissions: rolePermissions[record.role] };
}

export async function requirePermission(permission: StaffPermission) {
  const access = await staffAccess();
  return access?.permissions.includes(permission) ? access : null;
}
