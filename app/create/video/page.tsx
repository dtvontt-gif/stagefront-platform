"use client";

import { FormEvent, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Job = {
  id: string;
  status: string;
};

export default function VideoStudioPage() {
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState("10");
  const [quality, setQuality] = useState("best");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setJob(null);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, duration: Number(duration), quality, referenceUrl }),
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

  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#f4b400]">StageFront Create</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-tight sm:text-7xl">
          AI Video <span className="text-[#f4b400]">Studio</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
          Describe the moment. StageFront turns your idea into a vertical short and sends it to the connected video model.
        </p>

        <form onSubmit={generate} className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-[#0b0b0f] p-6 sm:p-8">
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase tracking-wide">Your idea</span>
            <textarea
              required
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="Example: Zoo Crew reveal. I stand in a rain-soaked rainforest as a beautiful anaconda approaches and chooses me. Cinematic, powerful, realistic."
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-[#f4b400]/70"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-wide">Reference image URL</span>
              <input
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="Optional HTTPS image URL"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#f4b400]/70"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-wide">Length</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl border border-white/10 bg-[#111114] px-4 py-3">
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-black uppercase tracking-wide">Generation mode</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {[["best", "Best", "Highest quality"], ["fast", "Fast", "Balanced speed"], ["cheap", "Saver", "Lower cost"]].map(([value, label, copy]) => (
                <button key={value} type="button" onClick={() => setQuality(value)} className={`rounded-2xl border p-4 text-left transition ${quality === value ? "border-[#f4b400] bg-[#f4b400]/10" : "border-white/10 bg-white/[0.02]"}`}>
                  <strong className="block uppercase">{label}</strong>
                  <span className="mt-1 block text-xs text-white/50">{copy}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
            TikTok format is locked to <strong className="text-white">9:16 vertical</strong>. The API key stays on the server and is never sent to the browser.
          </div>

          <button disabled={loading} className="rounded-full bg-[#f4b400] px-7 py-4 font-black uppercase tracking-wide text-black disabled:opacity-50">
            {loading ? "Starting…" : "Generate video"}
          </button>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
          {job && <div className="rounded-xl border border-[#f4b400]/30 bg-[#f4b400]/10 p-4"><strong>Generation started.</strong><p className="mt-1 text-sm text-white/60">Job {job.id} · {job.status}</p></div>}
        </form>
      </section>
      <Footer />
    </main>
  );
}
