import { serviceConfiguration } from "@/lib/stagefront-auth";

export const ZOO_COIN_PACKS = {
  "5": { amountCents: 500, coins: 500, label: "500 Zoo Coins" },
  "10": { amountCents: 1000, coins: 1000, label: "1,000 Zoo Coins" },
  "20": { amountCents: 2000, coins: 2000, label: "2,000 Zoo Coins" },
} as const;

export type ZooCoinPackId = keyof typeof ZOO_COIN_PACKS;

export async function grantZooCoins(
  userId: string,
  coins: number,
  sessionId: string,
  amountCents: number,
) {
  const config = serviceConfiguration();
  if (!config) throw new Error("Zoo Coin storage is not configured.");
  const response = await fetch(
    `${config.url}/rest/v1/rpc/zoo_live_credit_stripe_coin_purchase`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_session_id: sessionId,
        p_amount_cents: amountCents,
        p_coins: coins,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    console.error(
      "Zoo Coin credit failed",
      response.status,
      await response.text(),
    );
    throw new Error("Could not add Zoo Coins to the wallet.");
  }
  return Number(await response.json());
}
