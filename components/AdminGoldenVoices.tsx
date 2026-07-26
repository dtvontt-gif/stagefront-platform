"use client";

import { useCallback, useEffect, useState } from "react";

type Contestant = {
  id: number;
  display_name: string;
  email: string;
  username: string;
  song_title: string;
  song_artist: string;
  status: string;
};

type Settings = {
  season_title: string;
  upcoming_show_at: string | null;
  finals_at: string | null;
  current_round: string;
  registration_open: boolean;
  voting_open: boolean;
};

const statuses = ["registered", "confirmed", "performed", "advanced", "eliminated", "finalist", "winner"];

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function AdminGoldenVoices() {
  const [settings, setSettings] = useState<Settings>({
    season_title: "Golden Voices — Season One",
    upcoming_show_at: null,
    finals_at: null,
    current_round: "Auditions",
    registration_open: true,
    voting_open: false,
  });
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [message, setMessage] = useState("Loading Golden Voices...");
  const [busy, setBusy] = useState<number | "settings" | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/golden-voices", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { settings?: Settings; contestants?: Contestant[]; message?: string }) => {
        if (result.settings) setSettings(result.settings);
        setContestants(result.contestants ?? []);
        setMessage(result.message ?? "");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setBusy("settings");
    const response = await fetch("/api/admin/golden-voices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "settings",
        seasonTitle: settings.season_title,
        upcomingShowAt: settings.upcoming_show_at,
        finalsAt: settings.finals_at,
        currentRound: settings.current_round,
        registrationOpen: settings.registration_open,
        votingOpen: settings.voting_open,
      }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Golden Voices settings saved.");
    setBusy(null);
    if (response.ok) load();
  }

  async function changeStatus(id: number, status: string) {
    setBusy(id);
    const response = await fetch("/api/admin/golden-voices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contestant", id, status }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Contestant updated.");
    setBusy(null);
    if (response.ok) load();
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Competition control</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">
        Golden <span className="text-stage-gold">Voices.</span>
      </h2>

      <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7 lg:grid-cols-2">
        <label className="form-field"><span>Season title</span><input value={settings.season_title} onChange={(event) => setSettings({ ...settings, season_title: event.target.value })} /></label>
        <label className="form-field"><span>Current round</span><input value={settings.current_round} onChange={(event) => setSettings({ ...settings, current_round: event.target.value })} /></label>
        <label className="form-field"><span>Upcoming show</span><input type="datetime-local" value={localDate(settings.upcoming_show_at)} onChange={(event) => setSettings({ ...settings, upcoming_show_at: event.target.value || null })} /></label>
        <label className="form-field"><span>Finals date</span><input type="datetime-local" value={localDate(settings.finals_at)} onChange={(event) => setSettings({ ...settings, finals_at: event.target.value || null })} /></label>
        <label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={settings.registration_open} onChange={(event) => setSettings({ ...settings, registration_open: event.target.checked })} className="h-6 w-6 accent-[#f4b400]" />Registration open</label>
        <label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={settings.voting_open} onChange={(event) => setSettings({ ...settings, voting_open: event.target.checked })} className="h-6 w-6 accent-[#f4b400]" />Voting open</label>
        <button type="button" disabled={busy === "settings"} onClick={() => void saveSettings()} className="primary-cta lg:col-span-2">Save Golden Voices settings</button>
      </div>

      {message ? <p aria-live="polite" className="mt-5 text-sm text-white/55">{message}</p> : null}

      <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-white/50">
            <tr><th className="px-5 py-4">Contestant</th><th className="px-5 py-4">Song</th><th className="px-5 py-4">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-black/20">
            {contestants.map((contestant) => (
              <tr key={contestant.id}>
                <td className="px-5 py-4">
                  <p className="font-bold">{contestant.display_name} <span className="text-white/35">@{contestant.username}</span></p>
                  <p className="mt-1 text-xs text-white/40">{contestant.email}</p>
                </td>
                <td className="px-5 py-4 text-white/65">{contestant.song_title} · {contestant.song_artist}</td>
                <td className="px-5 py-4">
                  <select
                    value={contestant.status}
                    disabled={busy === contestant.id}
                    onChange={(event) => void changeStatus(contestant.id, event.target.value)}
                    className="rounded-xl border border-white/15 bg-[#111115] px-3 py-2 capitalize text-white"
                  >
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!contestants.length ? <p className="p-10 text-center text-white/45">No Golden Voices registrations yet.</p> : null}
      </div>
    </section>
  );
}
