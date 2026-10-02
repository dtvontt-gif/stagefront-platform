import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ message: "Sign in to view the live room." }, { status: 401 });

  const config = serviceConfiguration();
  if (!config) return Response.json({ message: "Superfan status is unavailable." }, { status: 503 });

  const body = await request.json().catch(() => null) as { userIds?: unknown } | null;
  if (!Array.isArray(body?.userIds) || body.userIds.length > 100 || body.userIds.some((id) => typeof id !== "string" || !uuid.test(id))) {
    return Response.json({ message: "Invalid member list." }, { status: 400 });
  }

  const userIds = [...new Set(body.userIds as string[])];
  if (!userIds.length) return Response.json({ userIds: [] });

  const query = new URLSearchParams({ select: "user_id", user_id: `in.(${userIds.join(",")})`, status: "eq.active" });
  const response = await fetch(`${config.url}/rest/v1/superfan_subscriptions?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ message: "Superfan status is unavailable." }, { status: 502 });
  const subscriptions = await response.json() as { user_id: string }[];
  return Response.json({ userIds: [...new Set(subscriptions.map((item) => item.user_id))] });
}
