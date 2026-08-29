"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function AdminHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [message, setMessage] = useState("Loading hosts...");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/hosts", { cache: "no-store" });
    const result = (await response.json()) as { hosts?: Host[]; message?: string };
    setHosts(result.hosts ?? []);
    setMessage(result.message ?? "");
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, []);

  function change(founderNumber: number, field: keyof Host, value: string | boolean) {
    setHosts((current) =>
      current.map((host) =>
        host.founder_number === founderNumber ? { ...host, [field]: value } : host,
      ),
    );
  }

  async function save(host: Host) {
    setBusy(host.founder_number);
    const response = await fetch("/api/admin/hosts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(host),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Host saved.");
    setBusy(null);
    if (response.ok) await load();
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Live host network</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">
        Host <span className="text-stage-gold">Directory.</span>
      </h2>
      <p className="mt-4 max-w-3xl text-white/55">
        Add each host&apos;s TikTok links, publish their profile, and switch their live status on
        when they are broadcasting.
      </p>
      <Link
        href="/scout"
        className="mt-5 inline-flex rounded-full border border-[#f4b400]/50 px-5 py-3 text-sm font-black text-[#f4b400] hover:bg-[#f4b400] hover:text-black"
      >
        Open iPhone Live Scout
      </Link>
      {message ? <p aria-live="polite" className="mt-5 text-sm text-white/60">{message}</p> : null}

      <div className="mt-8 grid gap-5">
        {hosts.map((host) => (
          <article
            key={host.founder_number}
            className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-display text-2xl font-black uppercase">
                  #{host.founder_number} {host.display_name}
                </h3>
                <p className="mt-1 text-sm text-white/45">@{host.username} · {host.email}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={host.host_published}
                    onChange={(event) =>
                      change(host.founder_number, "host_published", event.target.checked)
                    }
                    className="h-5 w-5 accent-[#f4b400]"
                  />
                  Publish profile
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-red-300">
                  <input
                    type="checkbox"
                    checked={host.is_live}
                    onChange={(event) =>
                      change(host.founder_number, "is_live", event.target.checked)
                    }
                    className="h-5 w-5 accent-red-500"
                  />
                  I&apos;m Live
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-semibold text-white/70">
                TikTok profile link
                <input
                  type="url"
                  value={host.tiktok_profile_url ?? ""}
                  onChange={(event) =>
                    change(host.founder_number, "tiktok_profile_url", event.target.value)
                  }
                  placeholder="https://www.tiktok.com/@username"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#f4b400]"
                />
              </label>
              <label className="text-sm font-semibold text-white/70">
                TikTok LIVE link
                <input
                  type="url"
                  value={host.tiktok_live_url ?? ""}
                  onChange={(event) =>
                    change(host.founder_number, "tiktok_live_url", event.target.value)
                  }
                  placeholder="https://www.tiktok.com/@username/live"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#f4b400]"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={busy === host.founder_number}
              onClick={() => void save(host)}
              className="mt-5 rounded-full bg-[#f4b400] px-6 py-3 font-extrabold text-black hover:bg-[#ffd05a] disabled:opacity-50"
            >
              {busy === host.founder_number ? "Saving..." : "Save host"}
            </button>
          </article>
        ))}
        {!hosts.length ? (
          <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">
            No members have selected the Host role yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
