"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: number;
  display_name: string;
  email: string;
  song_title: string;
  song_artist: string;
  notes: string | null;
  status: "waiting" | "called" | "completed" | "skipped";
};

export default function AdminQueue() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [averageMinutes, setAverageMinutes] = useState(5);
  const [message, setMessage] = useState("Loading Live Queue...");
  const [busy, setBusy] = useState<number | "settings" | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/queue", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: {
        entries?: Entry[];
        settings?: { is_open: boolean; average_minutes: number };
        message?: string;
      }) => {
        setEntries(result.entries ?? []);
        setIsOpen(result.settings?.is_open ?? false);
        setAverageMinutes(result.settings?.average_minutes ?? 5);
        setMessage(result.message ?? "");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setBusy("settings");
    const response = await fetch("/api/admin/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "settings", isOpen, averageMinutes }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Queue settings saved.");
    setBusy(null);
    if (response.ok) load();
  }

  async function updateEntry(id: number, status: string) {
    setBusy(id);
    const response = await fetch("/api/admin/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "entry", id, status }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Queue updated.");
    setBusy(null);
    if (response.ok) load();
  }

  const active = entries.filter((entry) => entry.status === "waiting" || entry.status === "called");

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Show control</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">
        Live <span className="text-stage-gold">Queue.</span>
      </h2>

      <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end sm:p-7">
        <label className="flex items-center gap-3 font-bold">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(event) => setIsOpen(event.target.checked)}
            className="h-6 w-6 accent-[#f4b400]"
          />
          Queue open for performers
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/55">
          Minutes per singer
          <input
            type="number"
            min={1}
            max={30}
            value={averageMinutes}
            onChange={(event) => setAverageMinutes(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy === "settings"}
          onClick={() => void saveSettings()}
          className="primary-cta disabled:opacity-50"
        >
          Save queue
        </button>
      </div>

      {message ? <p aria-live="polite" className="mt-5 text-sm text-white/55">{message}</p> : null}

      <div className="mt-8 grid gap-4">
        {active.map((entry, index) => (
          <article key={entry.id} className={`queue-admin-card ${entry.status === "called" ? "queue-admin-card-called" : ""}`}>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[#f4b400]">
                {entry.status === "called" ? "On stage now" : `Queue position ${index + 1}`}
              </p>
              <h3 className="mt-2 font-display text-2xl font-black uppercase">{entry.display_name}</h3>
              <p className="mt-1 text-sm text-white/55">{entry.song_title} · {entry.song_artist}</p>
              <p className="mt-2 text-xs text-white/35">{entry.email}</p>
              {entry.notes ? <p className="mt-3 text-sm text-white/45">Note: {entry.notes}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.status !== "called" ? (
                <button type="button" disabled={busy === entry.id} onClick={() => void updateEntry(entry.id, "called")} className="queue-action queue-action-call">
                  Call now
                </button>
              ) : null}
              <button type="button" disabled={busy === entry.id} onClick={() => void updateEntry(entry.id, "completed")} className="queue-action">
                Complete
              </button>
              <button type="button" disabled={busy === entry.id} onClick={() => void updateEntry(entry.id, "skipped")} className="queue-action">
                Skip
              </button>
              <button type="button" disabled={busy === entry.id} onClick={() => void updateEntry(entry.id, "removed")} className="queue-action queue-action-remove">
                Remove
              </button>
            </div>
          </article>
        ))}
        {!active.length ? (
          <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">
            No performers are waiting.
          </p>
        ) : null}
      </div>
    </section>
  );
}
