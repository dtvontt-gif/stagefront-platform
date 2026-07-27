"use client";

import { FormEvent, useEffect, useState } from "react";

type Station = {
  station_name: string; show_title: string; stream_url: string | null;
  tiktok_live_url: string | null; is_live: boolean;
};

export default function AdminAudioStation() {
  const [station, setStation] = useState<Station | null>(null);
  const [message, setMessage] = useState("Loading audio station...");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/admin/audio-stream", { cache: "no-store" });
    const result = (await response.json()) as { station?: Station; message?: string };
    setStation(result.station ?? null); setMessage(result.message ?? "");
  }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/audio-stream", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stationName: data.get("stationName"), showTitle: data.get("showTitle"),
        streamUrl: data.get("streamUrl"), tiktokLiveUrl: data.get("tiktokLiveUrl"),
        isLive: data.get("isLive") === "on",
      }),
    });
    const result = (await response.json()) as { message?: string };
    setBusy(false); setMessage(result.message ?? "Audio station saved.");
    if (response.ok) await load();
  }
  if (!station) return <p className="mx-auto max-w-6xl text-white/55">{message}</p>;
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Mixxx and Icecast</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">StageFront <span className="text-stage-gold">Radio.</span></h2>
      <p className="mt-4 max-w-3xl text-white/55">Paste the secure stream address supplied by your Icecast/Shoutcast host. Switch Live on only after Mixxx is connected and broadcasting.</p>
      <form onSubmit={save} className="mt-8 grid gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="form-field"><span>Station name</span><input name="stationName" defaultValue={station.station_name} required maxLength={80} /></label>
          <label className="form-field"><span>Current show title</span><input name="showTitle" defaultValue={station.show_title} required maxLength={120} /></label>
        </div>
        <label className="form-field"><span>Secure Icecast/Shoutcast listening URL</span><input name="streamUrl" type="url" defaultValue={station.stream_url ?? ""} placeholder="https://radio-host.example.com/live" /><small>This is the public listening URL, never the private source password.</small></label>
        <label className="form-field"><span>TikTok Live link (optional)</span><input name="tiktokLiveUrl" type="url" defaultValue={station.tiktok_live_url ?? ""} placeholder="https://www.tiktok.com/@yourname/live" /></label>
        <label className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-4 font-bold text-white/75">
          <input name="isLive" type="checkbox" defaultChecked={station.is_live} className="h-5 w-5 accent-red-500" />
          StageFront Radio is live now
        </label>
        <button disabled={busy} className="primary-cta disabled:opacity-50">{busy ? "Saving..." : "Save Audio Station"}</button>
      </form>
      {message ? <p className="mt-4 text-sm text-white/55">{message}</p> : null}
    </section>
  );
}
