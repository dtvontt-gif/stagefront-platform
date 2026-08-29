"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Host = {
  founder_number: number;
  display_name: string;
  username: string;
  email: string;
  tiktok_profile_url: string | null;
  tiktok_live_url: string | null;
  is_live: boolean;
  host_published: boolean;
};

const CHECKED_KEY = "stagefront:live-scout:checked";

function checkedLabel(value?: string) {
  if (!value) return "Not checked yet";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "Checked just now";
  if (elapsed < 60 * 60_000) return `Checked ${Math.max(1, Math.floor(elapsed / 60_000))}m ago`;
  return `Checked ${new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function LiveScout() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading the host list…");
  const [busy, setBusy] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [checked, setChecked] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(CHECKED_KEY) || "{}") as Record<string, string>;
    } catch {
      window.localStorage.removeItem(CHECKED_KEY);
      return {};
    }
  });
  const [standalone] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/admin/hosts", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/sign-in?next=/scout");
        return;
      }
      const result = (await response.json()) as { hosts?: Host[]; message?: string };
      if (!response.ok) throw new Error(result.message || "Could not load hosts.");
      setHosts(result.hosts ?? []);
      setLastSync(new Date());
      if (!quiet) setMessage(result.hosts?.length ? "Host list is up to date." : "No hosts have been added yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load hosts.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [load]);

  const visibleHosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return hosts
      .filter((host) => !query || [host.display_name, host.username, host.email].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => Number(b.is_live) - Number(a.is_live) || a.display_name.localeCompare(b.display_name));
  }, [hosts, search]);

  function rememberChecked(host: Host) {
    const next = { ...checked, [host.founder_number]: new Date().toISOString() };
    setChecked(next);
    window.localStorage.setItem(CHECKED_KEY, JSON.stringify(next));
  }

  async function setLive(host: Host, isLive: boolean) {
    setBusy(host.founder_number);
    setHosts((current) => current.map((item) => item.founder_number === host.founder_number ? { ...item, is_live: isLive } : item));
    try {
      const response = await fetch("/api/admin/hosts/live", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ founder_number: host.founder_number, is_live: isLive }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Could not update this host.");
      setMessage(result.message || "Live status updated.");
      rememberChecked(host);
      await load(true);
    } catch (error) {
      setHosts((current) => current.map((item) => item.founder_number === host.founder_number ? { ...item, is_live: host.is_live } : item));
      setMessage(error instanceof Error ? error.message : "Could not update this host.");
    } finally {
      setBusy(null);
    }
  }

  const liveCount = hosts.filter((host) => host.is_live).length;

  return (
    <main className="min-h-screen bg-[#070708] pb-[max(2rem,env(safe-area-inset-bottom))] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070708]/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f4b400]">StageFront</p>
            <h1 className="mt-1 font-display text-2xl font-black uppercase">Live Scout</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/hosts" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/70">Public view</a>
            <form action="/api/auth/sign-out" method="post">
              <button type="submit" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/70">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {!standalone ? (
          <section className="mb-5 rounded-3xl border border-[#f4b400]/30 bg-[#f4b400]/[0.08] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f4b400]">Install on iPhone</p>
            <p className="mt-2 text-sm leading-6 text-white/70">In Safari, tap the Share button, choose <strong className="text-white">Add to Home Screen</strong>, then tap Add.</p>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Hosts</span>
            <strong className="mt-2 block font-display text-4xl font-black">{hosts.length}</strong>
          </div>
          <div className="rounded-3xl border border-red-500/30 bg-red-500/[0.08] p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-red-200/70">Live now</span>
            <strong className="mt-2 block font-display text-4xl font-black text-red-300">{liveCount}</strong>
          </div>
        </section>

        <div className="mt-5 flex gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hosts"
            className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none focus:border-[#f4b400]"
          />
          <button type="button" onClick={() => void load()} className="rounded-2xl bg-[#f4b400] px-5 text-sm font-black text-black">Refresh</button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/40">
          <p aria-live="polite">{message}</p>
          {lastSync ? <p className="shrink-0">Synced {lastSync.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p> : null}
        </div>

        <section className="mt-5 grid gap-4">
          {visibleHosts.map((host) => {
            const tikTokUrl = host.tiktok_profile_url || host.tiktok_live_url;
            return (
              <article key={host.founder_number} className={`overflow-hidden rounded-3xl border ${host.is_live ? "border-red-500/60 bg-red-500/[0.08]" : "border-white/10 bg-white/[0.035]"}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {host.is_live ? <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span> : <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase text-white/45">Offline</span>}
                        {!host.host_published ? <span className="rounded-full border border-amber-300/30 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-200/70">Not published</span> : null}
                      </div>
                      <h2 className="mt-3 truncate font-display text-2xl font-black uppercase">{host.display_name}</h2>
                      <p className="mt-1 truncate text-sm text-white/45">@{host.username}</p>
                    </div>
                    <span className="shrink-0 text-xs text-white/30">#{host.founder_number}</span>
                  </div>
                  <p className="mt-4 text-xs text-white/38">{checkedLabel(checked[host.founder_number])}</p>
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10">
                  {tikTokUrl ? (
                    <a href={tikTokUrl} target="_blank" rel="noopener noreferrer" onClick={() => rememberChecked(host)} className="flex min-h-16 items-center justify-center bg-[#111115] px-4 text-center text-sm font-black text-[#f4b400]">Open TikTok ↗</a>
                  ) : (
                    <a href="/admin" className="flex min-h-16 items-center justify-center bg-[#111115] px-4 text-center text-xs font-bold text-amber-200">Add TikTok link</a>
                  )}
                  <button
                    type="button"
                    disabled={busy === host.founder_number}
                    onClick={() => void setLive(host, !host.is_live)}
                    className={`min-h-16 px-4 text-sm font-black disabled:opacity-50 ${host.is_live ? "bg-white text-black" : "bg-red-500 text-white"}`}
                  >
                    {busy === host.founder_number ? "Saving…" : host.is_live ? "Mark OFF" : "Mark LIVE"}
                  </button>
                </div>
              </article>
            );
          })}
          {!visibleHosts.length ? <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm text-white/45">{hosts.length ? "No hosts match that search." : "Add a Host member in StageFront and they will appear here automatically."}</p> : null}
        </section>
      </div>
    </main>
  );
}
