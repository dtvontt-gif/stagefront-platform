"use client";

import { useEffect, useMemo, useState } from "react";

type Account = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  createdAt: string;
  confirmedAt: string | null;
  lastSignInAt: string | null;
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading member accounts...");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/accounts", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { accounts?: Account[]; message?: string };
      if (active) { setAccounts(result.accounts ?? []); setMessage(result.message ?? ""); }
    });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? accounts.filter((account) => [account.email, account.displayName, account.username].some((value) => value.toLowerCase().includes(needle))) : accounts;
  }, [accounts, query]);
  const confirmed = accounts.filter((account) => account.confirmedAt).length;

  return <section className="mx-auto w-full max-w-6xl">
    <p className="section-kicker">Owner-only account records</p>
    <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Member <span className="text-stage-gold">Accounts.</span></h2>
    <p className="mt-4 max-w-3xl text-white/55">See who created a StageFront login, whether their email is confirmed, and whether they have ever signed in. Passwords are never visible.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><strong className="text-3xl text-[#f4b400]">{accounts.length}</strong><p className="mt-1 text-sm text-white/45">Total accounts</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><strong className="text-3xl text-emerald-300">{confirmed}</strong><p className="mt-1 text-sm text-white/45">Confirmed</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><strong className="text-3xl text-amber-300">{accounts.length-confirmed}</strong><p className="mt-1 text-sm text-white/45">Awaiting confirmation</p></div>
    </div>
    <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search name, username, or email" className="mt-7 w-full rounded-full border border-white/15 bg-black/30 px-5 py-3.5 text-white outline-none focus:border-[#f4b400]" />
    {message ? <p className="mt-5 text-sm text-white/55">{message}</p> : null}
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white/[.06] text-xs uppercase tracking-wider text-white/45"><tr><th className="p-4">Member</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4">Last sign-in</th></tr></thead>
      <tbody>{filtered.map((account)=><tr key={account.id} className="border-t border-white/10"><td className="p-4"><strong>{account.displayName||"No display name"}</strong>{account.username?<p className="text-xs text-[#f4b400]">@{account.username}</p>:null}</td><td className="p-4 text-white/65">{account.email}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${account.confirmedAt?"bg-emerald-400/10 text-emerald-300":"bg-amber-400/10 text-amber-300"}`}>{account.confirmedAt?"Confirmed":"Needs confirmation"}</span></td><td className="p-4 text-white/45">{date(account.createdAt)}</td><td className="p-4 text-white/45">{date(account.lastSignInAt)}</td></tr>)}</tbody></table>
    </div>
  </section>;
}
