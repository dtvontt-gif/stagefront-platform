"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type QueueEntry = {
  id: number;
  display_name: string;
  song_title: string;
  song_artist: string;
  status: "waiting" | "called";
  position: number;
  estimated_minutes: number;
};

type QueueData = {
  settings: { is_open: boolean; average_minutes: number };
  entries: QueueEntry[];
};

export default function LiveQueue() {
  const [data, setData] = useState<QueueData>({
    settings: { is_open: false, average_minutes: 5 },
    entries: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/queue", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: QueueData) => setData(result))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function joinQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Queue request completed.");
    setSubmitting(false);
    if (response.ok) {
      form.reset();
      refresh();
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
      <section aria-labelledby="join-queue-heading" className="queue-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Performer signup</p>
            <h2 id="join-queue-heading" className="mt-3 font-display text-3xl font-black uppercase">
              Join the queue.
            </h2>
          </div>
          <span className={`queue-state ${data.settings.is_open ? "queue-state-open" : ""}`}>
            {data.settings.is_open ? "Open" : "Closed"}
          </span>
        </div>

        <p className="mt-5 text-sm leading-7 text-white/55">
          Enter the song you want to perform. Your email is private and is only
          used to identify your request.
        </p>

        <form onSubmit={joinQueue} className="mt-8 grid gap-4">
          <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" />
          <label className="form-field">
            <span>Name</span>
            <input name="displayName" required minLength={2} maxLength={80} />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input name="email" type="email" required maxLength={254} />
          </label>
          <label className="form-field">
            <span>Song title</span>
            <input name="songTitle" required maxLength={120} />
          </label>
          <label className="form-field">
            <span>Original artist</span>
            <input name="songArtist" required maxLength={120} />
          </label>
          <label className="form-field">
            <span>Host note (optional)</span>
            <input name="notes" maxLength={300} placeholder="Key, version, or other details" />
          </label>
          <button
            type="submit"
            disabled={!data.settings.is_open || submitting}
            className="primary-cta mt-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Joining..." : data.settings.is_open ? "Join the Live Queue" : "Queue is closed"}
          </button>
        </form>
        {message ? <p aria-live="polite" className="mt-5 text-sm text-[#f4b400]">{message}</p> : null}
      </section>

      <section aria-labelledby="current-queue-heading" className="queue-panel">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="section-kicker">Live order</p>
            <h2 id="current-queue-heading" className="mt-3 font-display text-3xl font-black uppercase">
              Current queue.
            </h2>
          </div>
          <p className="text-xs text-white/35">Updates automatically every 15 seconds</p>
        </div>

        {loading ? (
          <p className="mt-10 text-white/45">Loading the queue...</p>
        ) : data.entries.length ? (
          <ol className="mt-8 grid gap-3">
            {data.entries.map((entry) => (
              <li key={entry.id} className={`queue-entry ${entry.status === "called" ? "queue-entry-called" : ""}`}>
                <div className="queue-position">
                  {entry.status === "called" ? "NOW" : `#${entry.position}`}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-black uppercase">{entry.display_name}</h3>
                  <p className="mt-1 truncate text-sm text-white/55">
                    {entry.song_title} · {entry.song_artist}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                  {entry.status === "called"
                    ? "On stage"
                    : entry.estimated_minutes
                      ? `~${entry.estimated_minutes} min`
                      : "Up next"}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="live-empty mt-8">
            <h3 className="font-display text-2xl font-black uppercase">The queue is empty.</h3>
            <p className="mt-3 text-sm text-white/45">
              {data.settings.is_open
                ? "Be the first performer to claim a spot."
                : "The host will open the queue when the next show begins."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
