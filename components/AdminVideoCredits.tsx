"use client";

import { useCallback, useEffect, useState } from "react";

type Purchase = {
  id: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  credits: number;
  purchasedAt: string;
  credited: boolean;
};

export default function AdminVideoCredits() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("Loading purchases…");
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/video-credits", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load purchases.");
    setPurchases(data.purchases);
    setMessage(data.purchases.length ? "" : "No paid video-credit purchases yet.");
  }, []);

  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [load]);

  async function restore(sessionId: string) {
    setWorking(sessionId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/video-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not restore credits.");
      setMessage(`Credits confirmed. Customer balance: ${data.balance}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore credits.");
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f4b400]">Payments</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">AI video credits</h2>
          <p className="mt-2 text-sm text-white/55">Paid Stripe checkouts and whether the credits reached the customer.</p>
        </div>
        <button type="button" onClick={() => void load().catch((error) => setMessage(error.message))} className="rounded-full border border-[#f4b400]/50 px-5 py-2 text-xs font-black uppercase text-[#f4b400]">Refresh</button>
      </div>
      {message && <p className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{message}</p>}
      <div className="grid gap-3">
        {purchases.map((purchase) => (
          <article key={purchase.id} className="grid gap-3 rounded-2xl border border-white/10 bg-[#0b0b0f] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <strong>{purchase.name || purchase.email}</strong>
              <p className="mt-1 text-sm text-white/55">{purchase.email} · {purchase.credits} credits · ${(purchase.amount / 100).toFixed(2)} {purchase.currency.toUpperCase()}</p>
              <p className="mt-1 text-xs text-white/35">{new Date(purchase.purchasedAt).toLocaleString()}</p>
            </div>
            {purchase.credited ? (
              <span className="text-xs font-black uppercase text-emerald-400">Credits delivered</span>
            ) : (
              <button type="button" disabled={Boolean(working)} onClick={() => restore(purchase.id)} className="rounded-full bg-[#f4b400] px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{working === purchase.id ? "Restoring…" : "Restore credits"}</button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
