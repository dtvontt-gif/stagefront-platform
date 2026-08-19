"use client";

import { FormEvent, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Job = {
  id: string;
  status: string;
  videoUrl?: string | null;
  resolution?: string | null;
  ratio?: string | null;
  duration?: number | null;
  error?: string | null;
};

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "expired"]);

export default function VideoStudioPage() {
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState("5");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job?.id || TERMINAL.has(job.status)) return;

    const jobId = job.id;
    let cancelled = false;
    let timer: number | undefined;

    async function checkStatus() {
      try {
        const response = await fetch(`/api/video/status/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check generation status.");
        if (!cancelled) {
          setJob(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not check generation status.");
        }
      }

      if (!cancelled) timer = window.setTimeout(checkStatus, 5000);
    }

    timer = window.setTimeout(checkStatus, 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [job?.id, job?.status]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setJob(null);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, duration: Number(duration), referenceUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start generation.");
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start generation.");
    } finally {
      setLoading(false);
    }
  }

  const working = job && !TERMINAL.has(job.status);

  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#f4b400]">StageFront Create</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-tight sm:text-7xl">
          AI Video <span className="text-[#f4b400]">Studio</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
          Describe the moment. StageFront sends it securely to Seedance and automatically checks until your vertical short is ready.
        </p>

        <form onSubmit={generate} className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-[#0b0b0f] p-6 sm:p-8">
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase tracking-wide">Your idea</span>
            <textarea
              required
              maxLength={2000}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="Example: Zoo Crew reveal. I stand in a rain-soaked rainforest as a beautiful anaconda approaches and chooses me. Cinematic, powerful, realistic."
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-[#f4b400]/70"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-wide">First-frame image URL</span>
              <input
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="Optional HTTPS image URL"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#f4b400]/70"
              />
              <span className="text-xs leading-5 text-white/40">Leave blank for text-to-video. Add an HTTPS image when you want Seedance to animate a starting frame.</span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-wide">Length</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl border border-white/10 bg-[#111114] px-4 py-3">
                {[2, 3, 4, 5, 6, 8, 10, 12].map((seconds) => (
                  <option key={seconds} value={seconds}>{seconds} seconds</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/60">
            Output is directed as a TikTok-style vertical short. The BytePlus API key stays on the server and is never sent to the browser.
          </div>

          <button disabled={loading || Boolean(working)} className="rounded-full bg-[#f4b400] px-7 py-4 font-black uppercase tracking-wide text-black disabled:opacity-50">
            {loading ? "Starting…" : working ? "Generating…" : "Generate video"}
          </button>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}

          {job && (
            <div className="rounded-2xl border border-[#f4b400]/30 bg-[#f4b400]/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="uppercase">{job.status === "succeeded" ? "Video ready" : "Generation status"}</strong>
                  <p className="mt-1 text-sm text-white/60">Job {job.id} · {job.status}</p>
                </div>
                {working && <span className="text-xs font-black uppercase tracking-[0.2em] text-[#f4b400]">Checking every 5 sec</span>}
              </div>

              {job.status === "succeeded" && job.videoUrl && (
                <div className="mt-5 grid gap-4">
                  <video src={job.videoUrl} controls playsInline className="mx-auto max-h-[70vh] w-full max-w-sm rounded-2xl bg-black" />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                    {job.resolution && <span>{job.resolution}</span>}
                    {job.ratio && <span>{job.ratio}</span>}
                    {job.duration && <span>{job.duration}s</span>}
                  </div>
                  <a href={job.videoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit rounded-full border border-[#f4b400]/50 px-5 py-3 text-sm font-black uppercase text-[#f4b400]">
                    Open finished MP4
                  </a>
                </div>
              )}

              {job.status === "succeeded" && !job.videoUrl && (
                <p className="mt-4 text-sm text-white/70">Seedance finished the task but did not return a playable video URL. Try the generation again.</p>
              )}

              {["failed", "cancelled", "expired"].includes(job.status) && (
                <p className="mt-4 text-sm text-white/70">{job.error || "This generation did not complete. Adjust the idea or reference image and try again."}</p>
              )}
            </div>
          )}
        </form>
      </section>
      <Footer />
    </main>
  );
}
