"use client";

import { useEffect, useState } from "react";

type Host = {
  founder_number: number;
  display_name: string;
  username: string;
  tiktok_profile_url: string | null;
  tiktok_live_url: string | null;
  is_live: boolean;
};

export default function HostsDirectory() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hosts", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { hosts?: Host[] }) => setHosts(result.hosts ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="mt-12 text-center text-white/50">Loading StageFront hosts...</p>;

  if (!hosts.length) {
    return (
      <div className="mt-12 rounded-3xl border border-dashed border-[#f4b400]/25 bg-[#f4b400]/[0.035] p-10 text-center">
        <h2 className="font-display text-2xl font-black uppercase">Host profiles are coming online.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/50">
          StageFront hosts will appear here as their TikTok profiles and live links are published.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {hosts.map((host) => (
        <article
          key={host.founder_number}
          className={`relative overflow-hidden rounded-3xl border p-7 ${
            host.is_live
              ? "border-red-500/60 bg-red-500/[0.07] shadow-[0_0_45px_rgba(239,68,68,0.12)]"
              : "border-white/10 bg-white/[0.035]"
          }`}
        >
          {host.is_live ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Live now
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-white/35">StageFront host</span>
          )}
          <h2 className="mt-5 font-display text-3xl font-black uppercase">{host.display_name}</h2>
          <p className="mt-2 text-white/48">@{host.username}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {host.tiktok_profile_url ? (
              <a
                href={host.tiktok_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold hover:border-[#f4b400] hover:text-[#f4b400]"
              >
                TikTok profile
              </a>
            ) : null}
            {host.is_live && host.tiktok_live_url ? (
              <a
                href={host.tiktok_live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-red-500 px-5 py-3 text-sm font-black text-white hover:bg-red-400"
              >
                Watch LIVE
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
