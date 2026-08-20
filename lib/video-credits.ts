import { isAdministrator, serviceConfiguration } from "@/lib/stagefront-auth";

const serviceHeaders = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

export const VIDEO_PACKS = {
  single: { credits: 1, amount: 399, label: "1 video credit" },
  trio: { credits: 3, amount: 999, label: "3 video credits" },
  five: { credits: 5, amount: 1499, label: "5 video credits" },
} as const;

export type VideoPackId = keyof typeof VIDEO_PACKS;

export async function videoCreditBalance(userId: string) {
  const config = serviceConfiguration();
  if (!config) throw new Error("Video credit storage is not configured.");
  const query = new URLSearchParams({ select: "balance", user_id: `eq.${userId}`, limit: "1" });
  const response = await fetch(`${config.url}/rest/v1/video_credit_balances?${query}`, {
    headers: serviceHeaders(config.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not read the video credit balance.");
  const [record] = (await response.json()) as { balance: number }[];
  return record?.balance ?? 0;
}

async function creditRpc(name: string, body: Record<string, unknown>) {
  const config = serviceConfiguration();
  if (!config) throw new Error("Video credit storage is not configured.");
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(config.serviceKey),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Video credit RPC ${name} failed`, response.status, await response.text());
    throw new Error("Could not update video credits.");
  }
  return response.json();
}

export async function consumeVideoCredit(userId: string, reference: string) {
  return Boolean(
    await creditRpc("stagefront_consume_video_credit", {
      target_user: userId,
      event_ref: reference,
    }),
  );
}

export async function grantVideoCredits(
  userId: string,
  amount: number,
  kind: string,
  reference: string,
  metadata: Record<string, unknown> = {},
) {
  return Number(
    await creditRpc("stagefront_grant_video_credits", {
      target_user: userId,
      credit_amount: amount,
      event_kind: kind,
      event_ref: reference,
      event_metadata: metadata,
    }),
  );
}

export function ownerHasFreeVideoAccess(email?: string) {
  return isAdministrator(email);
}
