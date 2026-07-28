"use client";

import { useEffect, useState } from "react";
import CasterFmPlayer from "@/components/CasterFmPlayer";

type Station = {
  station_name: string; show_title: string; stream_url: string | null;
  tiktok_live_url: string | null; is_live: boolean;
};

export default function StageFrontAudioPlayer({ compact = false }: { compact?: boolean }) {
  const [station, setStation] = useState<Station | null>(null);
  const [message, setMessage] = useState("Checking the broadcast...");

  useEffect(() => {
    fetch("/api/audio-stream", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { station?: Station | null }) => {
        setStation(result.station ?? null);
        setMessage("");
      })
      .catch(() => setMessage("The station could not be reached."));
  }, []);

  const live = Boolean(station?.is_live);
  return (
    <section className={`audio-station ${compact ? "audio-station-compact" : ""}`} aria-label="StageFront live audio">
      <div className="audio-station-glow" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`live-status ${live ? "" : "live-status-offline"}`}>
            <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-white" : "bg-white/50"}`} />
            {live ? "Live audio" : "Off air"}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">{station?.station_name ?? "StageFront Radio"}</span>
        </div>
        <h2 className={`mt-6 font-display font-black uppercase ${compact ? "text-3xl" : "text-4xl sm:text-6xl"}`}>{station?.show_title ?? "The next show is being prepared."}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
          {live ? "Listen here while you browse StageFront, or open TikTok to join the live conversation." : "When the show begins, the gold Listen Live button will activate here."}
        </p>
        {live ? <CasterFmPlayer /> : null}
        <div className="mt-7 flex flex-wrap gap-3">
          {station?.tiktok_live_url ? <a href={station.tiktok_live_url} target="_blank" rel="noreferrer" className="live-secondary-cta">Join on TikTok ↗</a> : null}
        </div>
        {message ? <p aria-live="polite" className="mt-4 text-xs text-white/45">{message}</p> : null}
      </div>
    </section>
  );
}
