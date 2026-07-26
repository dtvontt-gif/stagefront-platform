"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Host = {
  founder_number: number;
  display_name: string;
  username: string;
  tiktok_profile_url: string | null;
  tiktok_live_url: string | null;
  is_live: boolean;
};

export default function LiveHosts({ compact = false }: { compact?: boolean }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hosts", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { hosts?: Host[] }) =>
        setHosts((result.hosts ?? []).filter((host) => host.is_live)),
      )
      .finally(() => setLoading(false));
  }, []);

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
      {hosts.map((host) => (
        <article key={host.founder_number} className="live-host-card">
          <span className="live-status">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Live now
          </span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-white/35">
            StageFront host
          </p>
          <h3 className="mt-3 font-display text-3xl font-black uppercase">
            {host.display_name}
          </h3>
          <p className="mt-2 text-sm text-white/45">@{host.username}</p>
          <p className="mt-6 text-sm leading-7 text-white/60">
            Watch the live broadcast, then open TikTok to join the conversation
            and interact with the host.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {host.tiktok_live_url ? (
              <a
                href={host.tiktok_live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="live-primary-cta"
              >
                Watch &amp; interact live
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            {host.tiktok_profile_url ? (
              <a
                href={host.tiktok_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="live-secondary-cta"
              >
                TikTok profile
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
