"use client";

import { useCallback, useEffect, useState } from "react";

type Job = { id: string; kind: string; status: string; progress: number | null; error: string | null; attempts: number; updated_at: string };
type Project = { id: string; title: string; artist: string | null; status: string; owner_email: string; created_at: string; updated_at: string; latest_job: Job | null };
type Activity = { counts: { total: number; queued: number; running: number; failed: number; succeeded: number }; projects: Project[] };

export default function AdminKaraokeV2() {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [message, setMessage] = useState("Loading Karaoke Engine activity…");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/karaoke-v2", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load engine activity.");
    setActivity(data);
    setMessage(data.projects.length ? "" : "Nobody has created a Karaoke Engine v2 project yet.");
  }, []);
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [load]);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#f4b400]">Engine activity</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Karaoke v2 usage</h2><p className="mt-2 text-sm text-white/55">See who is using the engine and whether each project is moving or needs attention.</p></div>
        <button type="button" onClick={() => void load().catch((error) => setMessage(error.message))} className="rounded-full border border-[#f4b400]/50 px-5 py-2 text-xs font-black uppercase text-[#f4b400]">Refresh</button>
      </div>
      {activity ? <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(activity.counts).map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="text-2xl font-black text-[#f4b400]">{value}</div><div className="mt-1 text-xs font-bold uppercase text-white/45">{label}</div></div>)}</div> : null}
      {message ? <p className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{message}</p> : null}
      <div className="grid gap-3">{activity?.projects.map((project) => {
        const job = project.latest_job; const danger = job?.status === "failed";
        return <article key={project.id} className={`rounded-2xl border bg-[#0b0b0f] p-5 ${danger ? "border-red-500/40" : "border-white/10"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{project.title}</strong>{project.artist ? <span className="text-white/50"> · {project.artist}</span> : null}<p className="mt-1 text-sm text-white/55">{project.owner_email}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${danger ? "bg-red-500/15 text-red-300" : job?.status === "running" ? "bg-blue-500/15 text-blue-300" : "bg-white/10 text-white/65"}`}>{job ? `${job.kind}: ${job.status}` : project.status}</span></div>
          <p className="mt-3 text-xs text-white/35">Created {new Date(project.created_at).toLocaleString()} · Updated {new Date(project.updated_at).toLocaleString()}{job?.attempts ? ` · ${job.attempts} attempt${job.attempts === 1 ? "" : "s"}` : ""}</p>
          {job?.error ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{job.error}</p> : null}
        </article>;
      })}</div>
    </section>
  );
}
