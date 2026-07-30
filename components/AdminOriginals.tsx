"use client";

import { useCallback, useEffect, useState } from "react";

type Submission = {
  id: number; artist_name: string; song_title: string; genre: string; story: string;
  audio_url: string; status: string; featured: boolean; email: string;
};

export default function AdminOriginals() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState("Loading original music...");
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(() => {
    fetch("/api/admin/originals", { cache: "no-store" }).then((response) => response.json())
      .then((result: { submissions?: Submission[]; message?: string }) => {
        setSubmissions(result.submissions ?? []); setMessage(result.message ?? "");
      });
  }, []);
  useEffect(() => load(), [load]);
  async function update(submission: Submission, status: string, featured = submission.featured) {
    setBusy(submission.id);
    const response = await fetch("/api/admin/originals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: submission.id, status, featured }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Submission updated."); setBusy(null);
    if (response.ok) load();
  }
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Original Artist Showcase</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Music <span className="text-stage-gold">Submissions.</span></h2>
      {message ? <p className="mt-5 text-sm text-white/55">{message}</p> : null}
      <div className="mt-8 grid gap-4">
        {submissions.map((submission) => (
          <article key={submission.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-wider text-[#f4b400]">{submission.status} · {submission.genre || "Genre not listed"}</p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase">{submission.song_title}</h3>
                <p className="mt-1 text-white/55">{submission.artist_name} · {submission.email}</p>
                <p className="mt-4 text-sm leading-7 text-white/55">{submission.story}</p>
                <audio controls preload="none" src={submission.audio_url} className="mt-5 w-full" />
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button disabled={busy === submission.id} onClick={() => void update(submission, "approved", false)} className="secondary-cta">Approve</button>
                <button disabled={busy === submission.id} onClick={() => void update(submission, "approved", true)} className="primary-cta">Feature</button>
                <button disabled={busy === submission.id} onClick={() => void update(submission, "rejected", false)} className="rounded-full border border-red-400/40 px-5 py-3 text-sm font-black text-red-300">Reject</button>
              </div>
            </div>
          </article>
        ))}
        {!submissions.length ? <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/45">No original music submissions yet.</p> : null}
      </div>
    </section>
  );
}

