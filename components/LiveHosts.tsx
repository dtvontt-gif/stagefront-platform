"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Host = {
  founder_number: number;
  display_name: string;
  username: string;
  tiktok_profile_url: string | null;
  tiktok_live_url: string | null;
  is_live: boolean;
  profile_image_url: string | null;
};

export default function LiveHosts({ compact = false }: { compact?: boolean }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/hosts", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { hosts?: Host[] }) =>
        setHosts((result.hosts ?? []).filter((host) => host.is_live)),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="live-empty" aria-live="polite">
        Checking the StageFront stage...
      </div>
    );
  }

  if (!hosts.length) {
    return (
      <div className="live-empty">
        <span className="live-status live-status-offline">Currently off air</span>
        <h3 className="mt-6 font-display text-3xl font-black uppercase">
          The next show is being prepared.
        </h3>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55">
          When a StageFront host switches on their live status, their Watch
          Live button will appear here automatically.
        </p>
        <Link href="/hosts" className="support-cta mt-7">
          Explore StageFront hosts
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`grid gap-5 ${compact ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      {hosts.map((host) => {
        const destination = host.tiktok_live_url || host.tiktok_profile_url;
        const card = (
          <article className="live-host-card">
            <div
              className="live-host-preview"
              style={host.profile_image_url ? { backgroundImage: `url("${host.profile_image_url}")` } : undefined}
            >
              {!host.profile_image_url ? (
                <span className="live-host-initial">{host.display_name.slice(0, 1)}</span>
              ) : null}
              <span className="live-status live-host-badge">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Live now
              </span>
              <span className="live-preview-note">Silent preview</span>
            </div>
            <div className="live-host-copy">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/35">
                StageFront host
              </p>
              <h3 className="mt-2 font-display text-3xl font-black uppercase">
                {host.display_name}
              </h3>
              <p className="mt-1 text-sm text-white/45">@{host.username}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f4b400]">
                Enter Live on TikTok <span aria-hidden="true">↗</span>
              </span>
            </div>
          </article>
        );
        return destination ? (
          <a
            key={host.founder_number}
            href={destination}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${host.display_name}'s live on TikTok`}
            className="live-host-link"
          >
            {card}
          </a>
        ) : (
          <div key={host.founder_number}>{card}</div>
        );
      })}
    </div>
  );
}
