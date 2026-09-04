import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: { display_name?: string; username?: string };
};

export async function GET() {
  const owner = await requirePermission("staff");
  const config = serviceConfiguration();
  if (!owner) return Response.json({ message: "Owner access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Account service is not configured." }, { status: 503 });

  const response = await fetch(`${config.url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ message: "Unable to load member accounts." }, { status: 502 });
  const result = (await response.json()) as { users?: AuthUser[] };
  const accounts = (result.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? "",
    displayName: user.user_metadata?.display_name ?? "",
    username: user.user_metadata?.username ?? "",
    createdAt: user.created_at,
    confirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ accounts });
}
