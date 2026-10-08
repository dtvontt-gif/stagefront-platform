"use client";

import { useCallback, useEffect, useState } from "react";

const packages = [
  { amount: "5", price: "$5", coins: 500 },
  { amount: "10", price: "$10", coins: 1000 },
  { amount: "20", price: "$20", coins: 2000 },
] as const;

export default function ZooCoinWallet() {
  const [balance, setBalance] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/live/coins", { cache: "no-store" });
      const result = (await response.json()) as {
        balance?: number;
        enabled?: boolean;
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.message || "Wallet could not load.");
      setBalance(Number(result.balance || 0));
      setEnabled(Boolean(result.enabled));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Wallet could not load.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("coins");
    if (status === "added") setMessage("Coins added to your wallet.");
    if (status === "cancelled") setMessage("Coin purchase cancelled.");
    if (status === "processing")
      setMessage("Your payment is processing. Refresh your wallet shortly.");
    void load();
  }, [load]);

  async function buy(amount: string) {
    if (!enabled || busy) return;
    setBusy(amount);
    setMessage("");
    try {
      const response = await fetch("/api/live/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: amount, returnTo: "profile" }),
      });
      const result = (await response.json()) as {
        approvalUrl?: string;
        message?: string;
      };
      if (!response.ok || !result.approvalUrl)
        throw new Error(result.message || "Checkout could not start.");
      window.location.assign(result.approvalUrl);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Checkout could not start.",
      );
      setBusy(null);
    }
  }

  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-[#f4b400]/30 bg-[linear-gradient(145deg,rgba(244,180,0,.11),rgba(255,255,255,.025))] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="section-kicker">Zoo Coin Wallet</p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
            My <span className="text-stage-gold">coins.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            Your Zoo Coins stay with your StageFront account and can be used for
            gifts during Zoo Crew live rooms.
          </p>
        </div>
        <div className="min-w-44 rounded-3xl border border-[#f4b400]/30 bg-black/35 px-6 py-5 text-center">
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
            Available balance
          </p>
          <p className="mt-2 text-4xl font-black text-[#f4b400]">
            {loading ? "…" : balance.toLocaleString()}
          </p>
          <p className="text-xs font-bold uppercase text-white/40">Zoo Coins</p>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {packages.map((pack) => (
          <button
            key={pack.amount}
            type="button"
            disabled={!enabled || Boolean(busy)}
            onClick={() => void buy(pack.amount)}
            className="rounded-2xl border border-white/10 bg-black/30 p-5 text-left transition hover:border-[#f4b400]/55 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <strong className="block text-xl text-white">
              {pack.coins.toLocaleString()} coins
            </strong>
            <span className="mt-1 block text-sm font-black text-[#f4b400]">
              {busy === pack.amount ? "Opening PayPal…" : pack.price}
            </span>
          </button>
        ))}
      </div>

      {!enabled ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/55">
          Coin purchases are coming soon. Your wallet is ready, but real-money
          checkout remains disabled during beta.
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-white/75 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh balance"}
        </button>
        {message ? (
          <p aria-live="polite" className="text-sm text-white/60">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
