"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Job = {
  id: string;
  status: string;
  videoUrl?: string | null;
  resolution?: string | null;
  ratio?: string | null;
  duration?: number | null;
  progress?: number | null;
  error?: string | null;
};

type Access = {
  signedIn: boolean;
  owner: boolean;
  credits: number;
  packs: Record<string, { credits: number; amount: number; label: string }>;
};

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "expired"]);
const MAX_IMAGE_BYTES = 2_500_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SAVED_JOB_KEY = "stagefront:last-video-job";

export default function VideoStudioPage() {
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState("5");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAccess() {
    const response = await fetch("/api/video/access", { cache: "no-store" });
    if (response.ok) setAccess(await response.json());
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_JOB_KEY);
      if (saved) {
        const restored = JSON.parse(saved) as Job;
        if (restored?.id && restored?.status) {
          setJob(restored.status === "succeeded" ? { ...restored, status: "pending" } : restored);
          setNotice(restored.status === "succeeded" ? "Your last finished video was restored." : "Your last video generation was restored.");
        }
      }
    } catch {
      window.localStorage.removeItem(SAVED_JOB_KEY);
    }
    void loadAccess();
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout === "success") {
      const sessionId = new URLSearchParams(window.location.search).get("session_id");
      setNotice("Payment received. Confirming your credits…");
      if (sessionId) {
        void fetch("/api/video/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).then(async (response) => {
          const data = await response.json();
          if (!response.ok && response.status !== 202) throw new Error(data.error || "Could not confirm credits.");
          await loadAccess();
          setNotice(response.status === 202 ? "Payment is still processing. Your credits will appear automatically." : "Payment confirmed. Your credits are ready.");
          window.history.replaceState({}, "", "/create/video");
        }).catch((err) => {
          setNotice(err instanceof Error ? err.message : "Payment was received, but credits could not be confirmed yet.");
        });
      }
      const timers = [2000, 5000, 10000].map((delay) => window.setTimeout(() => void loadAccess(), delay));
      return () => timers.forEach(window.clearTimeout);
    }
    if (checkout === "cancelled") setNotice("Checkout was cancelled. You were not charged.");
  }, []);

  useEffect(() => {
    if (job?.id) window.localStorage.setItem(SAVED_JOB_KEY, JSON.stringify(job));
  }, [job]);

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

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Choose an image smaller than 2.5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(String(reader.result || ""));
      setReferenceName(file.name);
      setReferenceUrl("");
    };
    reader.onerror = () => setError("That image could not be opened. Try another one.");
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setReferenceImage("");
    setReferenceName("");
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setJob(null);
    window.localStorage.removeItem(SAVED_JOB_KEY);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          duration: Number(duration),
          referenceUrl: referenceImage || referenceUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start generation.");
      setJob(data);
      if (access && !access.owner) setAccess({ ...access, credits: Math.max(0, access.credits - 1) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start generation.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout(pack: string) {
    setCheckoutLoading(pack);
    setError("");
    try {
      const response = await fetch("/api/video/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open checkout.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout.");
      setCheckoutLoading("");
    }
  }

  const working = job && !TERMINAL.has(job.status);

  return (
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#f4b400]">StageFront Create</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-tight sm:text-7xl">
          AI Video <span className="text-[#f4b400]">Studio</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
          Describe the moment. StageFront sends it securely to Runway and automatically checks until your vertical short is ready.
        </p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b0b0f] p-6">
          {!access ? (
            <p className="text-sm text-white/55">Checking video access…</p>
          ) : !access.signedIn ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white/65">Sign in to create AI videos and purchase credits.</p>
              <Link href="/sign-in?next=/create/video" className="rounded-full bg-[#f4b400] px-5 py-3 text-sm font-black uppercase text-black">Sign in</Link>
            </div>
          ) : access.owner ? (
            <p className="font-black uppercase text-[#f4b400]">Owner access · Unlimited videos</p>
          ) : (
            <div className="grid gap-5">
              <div>
                <p className="font-black uppercase text-[#f4b400]">{access.credits} video credit{access.credits === 1 ? "" : "s"}</p>
                <p className="mt-1 text-sm text-white/50">One credit creates one video at any available length.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(access.packs).map(([id, pack]) => (
                  <button key={id} type="button" onClick={() => checkout(id)} disabled={Boolean(checkoutLoading)} className="rounded-2xl border border-[#f4b400]/40 p-4 text-left transition hover:border-[#f4b400] disabled:opacity-50">
                    <strong className="block uppercase">{pack.label}</strong>
                    <span className="mt-1 block text-[#f4b400]">${(pack.amount / 100).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {notice && <p className="mt-4 text-sm text-white/65">{notice}</p>}
        </div>

        <form onSubmit={generate} className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-[#0b0b0f] p-6 sm:p-8">
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase tracking-wide">Your idea</span>
            <textarea
              required
              maxLength={800}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="Example: Zoo Crew reveal. I stand in a rain-soaked rainforest as a beautiful anaconda approaches and chooses me. Cinematic, powerful, realistic."
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-[#f4b400]/70"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-3">
              <span className="text-sm font-black uppercase tracking-wide">Upload a starting image</span>
              <label className="relative grid min-h-40 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-[#f4b400]/45 bg-[#f4b400]/5 p-4 text-center transition hover:border-[#f4b400]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={chooseImage}
                  className="sr-only"
                />
                {referenceImage ? (
                  <Image src={referenceImage} alt="Selected starting frame" fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-contain p-3" />
                ) : (
                  <span>
                    <strong className="block text-[#f4b400]">Choose photo</strong>
                    <span className="mt-1 block text-xs leading-5 text-white/45">JPG, PNG, or WebP · up to 2.5 MB</span>
                  </span>
                )}
              </label>
              {referenceImage && (
                <div className="flex items-center justify-between gap-3 text-xs text-white/55">
                  <span className="truncate">{referenceName}</span>
                  <button type="button" onClick={removeImage} className="font-black uppercase text-[#f4b400]">Remove</button>
                </div>
              )}
              <span className="text-xs leading-5 text-white/40">Optional. Runway uses this photo as the first frame and follows your text instructions.</span>
            </div>
            <div className="grid content-start gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide">Or use an image URL</span>
              <input
                value={referenceUrl}
                onChange={(e) => {
                  setReferenceUrl(e.target.value);
                  if (e.target.value) removeImage();
                }}
                placeholder="Optional HTTPS image URL"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#f4b400]/70"
              />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide">Length</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl border border-white/10 bg-[#111114] px-4 py-3">
                  {[2, 3, 4, 5, 6, 8, 10].map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds} seconds</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/60">
            Output is directed as a TikTok-style vertical MP4. Your Runway API key stays on the server and is never sent to the browser.
          </div>

          <button disabled={loading || Boolean(working) || !access?.signedIn || (!access.owner && access.credits < 1)} className="rounded-full bg-[#f4b400] px-7 py-4 font-black uppercase tracking-wide text-black disabled:opacity-50">
            {loading ? "Starting…" : working ? "Generating…" : "Generate video"}
          </button>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}

          {job && (
            <div className="rounded-2xl border border-[#f4b400]/30 bg-[#f4b400]/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="uppercase">{job.status === "succeeded" ? "Video ready" : "Generation status"}</strong>
                  <p className="mt-1 text-sm text-white/60">Job {job.id} · {job.status}{typeof job.progress === "number" ? ` · ${Math.round(job.progress * 100)}%` : ""}</p>
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
                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <a href={`/api/video/download/${encodeURIComponent(job.id)}`} download className="inline-flex justify-center rounded-full bg-[#f4b400] px-6 py-4 text-sm font-black uppercase text-black">
                      Download video
                    </a>
                    <a href={job.videoUrl} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-full border border-[#f4b400]/50 px-5 py-4 text-sm font-black uppercase text-[#f4b400]">
                      Open full screen
                    </a>
                  </div>
                  <p className="text-xs leading-5 text-white/45">Download it to your phone before leaving. Your latest video will also return here if you accidentally refresh this page.</p>
                </div>
              )}

              {job.status === "succeeded" && !job.videoUrl && (
                <p className="mt-4 text-sm text-white/70">Runway finished the task but did not return a playable video URL. Try the generation again.</p>
              )}

              {["failed", "cancelled", "expired"].includes(job.status) && (
                <p className="mt-4 text-sm text-white/70">{job.error || "This generation did not complete. Adjust the idea or reference image and try again."}</p>
              )}
            </div>
          )}
        </form>
      </section>
  );
}
