"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import LyricsEditor from "@/components/karaoke-v2/LyricsEditor";

type Project = { id: string; title: string; artist: string | null; status: string; created_at: string };
type Job = { id: string; project_id: string; kind: string; status: string; progress: number | null; error: string | null };
type Asset = { id: string; project_id: string; kind: "vocals" | "instrumental"; mime_type: string; size_bytes: number };
type ActiveAudio = { projectId: string; kind: Asset["kind"]; url: string };
const FALLBACK_MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", m4a: "audio/mp4", mp4: "audio/mp4",
};
const SOURCE_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/mp4", "audio/x-m4a", "video/mp4",
]);
const MAX_SOURCE_BYTES = 250 * 1024 * 1024;

export default function ProjectUploader({ email, supabaseUrl, supabaseAnonKey }: {
  email: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAudio, setActiveAudio] = useState<ActiveAudio | null>(null);
  const [trackWorking, setTrackWorking] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const readyProjects = projects.filter((project) => {
    const job = jobs.find((item) => item.project_id === project.id && item.kind !== "render");
    return (job?.status || project.status) === "succeeded";
  });

  const load = useCallback(async () => {
    const response = await fetch("/api/karaoke-v2/projects", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setProjects(data.projects || []);
      setJobs(data.jobs || []);
      setAssets(data.assets || []);
    }
  }, []);

  useEffect(() => {
    let lastSessionRefresh = 0;
    async function refreshSession(force = false) {
      if (!force && Date.now() - lastSessionRefresh < 5 * 60 * 1000) return;
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (response.ok) lastSessionRefresh = Date.now();
      } catch {
        // A temporary network interruption should not close the editor.
      }
    }
    void refreshSession(true).then(load);
    const refresh = window.setInterval(() => void load(), 10000);
    const keepSignedIn = window.setInterval(() => void refreshSession(true), 30 * 60 * 1000);
    const returnedToStudio = () => { if (document.visibilityState === "visible") void refreshSession(); };
    document.addEventListener("visibilitychange", returnedToStudio);
    return () => { window.clearInterval(refresh); window.clearInterval(keepSignedIn); document.removeEventListener("visibilitychange", returnedToStudio); };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData(formElement);
      const file = form.get("audio");
      if (!(file instanceof File) || !file.size) throw new Error("Choose an audio file.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      const mimeType = file.type || FALLBACK_MIME[extension || ""] || "";
      if (!SOURCE_TYPES.has(mimeType) || file.size > MAX_SOURCE_BYTES) {
        throw new Error("Choose an MP3, WAV, FLAC, M4A, or MP4 file under 250 MB.");
      }
      // Browsers label MP4 containers as video/mp4 even when they are being
      // ingested as an audio source. Storage already permits audio/mp4.
      const storageMimeType = mimeType === "video/mp4" ? "audio/mp4" : mimeType;

      const createResponse = await fetch("/api/karaoke-v2/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.get("title"), artist: form.get("artist") }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error || "Could not create project.");
      const projectId = created.project.id as string;

      const signResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType, size: file.size }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || "Could not prepare upload.");

      const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { error: uploadError } = await client.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: storageMimeType,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const completeResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: signed.path, fileName: file.name, mimeType: storageMimeType, size: file.size }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Could not finalize upload.");

      formElement.reset();
      setNotice("Song uploaded. The preparation job is queued.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
      await load();
    } finally {
      setWorking(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.assign("/sign-in");
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}”?`)) return;
    setError("");
    const response = await fetch(`/api/karaoke-v2/projects/${project.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Could not delete the project.");
    else {
      setNotice("Incomplete project deleted.");
      await load();
    }
  }

  async function trackUrl(projectId: string, kind: Asset["kind"], download: boolean) {
    const key = `${projectId}-${kind}-${download ? "download" : "play"}`;
    setTrackWorking(key);
    setError("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/assets/${kind}/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ download }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open the audio track.");
      if (download) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = `${kind}.mp3`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        setActiveAudio({ projectId, kind, url: result.url });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open the audio track.");
    } finally {
      setTrackWorking("");
    }
  }

  return (
    <>
      <header className="studio-header"><div><p className="eyebrow">StageFront</p><h1>Karaoke v2</h1><p>{email}</p></div><button className="secondary" onClick={signOut}>Sign out</button></header>
      <form className="panel form" onSubmit={submit}>
        <h2>Start a karaoke project</h2>
        <label>Song title<input name="title" maxLength={160} required /></label>
        <label>Artist<input name="artist" maxLength={160} /></label>
        <label>Source audio<input name="audio" type="file" accept=".mp3,.wav,.flac,.m4a,.mp4,audio/*" required /></label>
        <small>MP3, WAV, FLAC, M4A, or MP4 audio · maximum 250 MB</small>
        <button disabled={working}>{working ? "Uploading…" : "Create project and upload"}</button>
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
      </form>
      {readyProjects.length > 0 && <nav className="song-switcher" aria-label="Songs ready to edit">
        <div><strong>Choose a song to edit</strong><small>{editingProject ? "Save your changes before switching songs." : "You can work on any finished song."}</small></div>
        <div className="song-switcher-buttons">{readyProjects.map((project) => <button className={editingProject?.id === project.id ? "active" : "secondary"} type="button" key={project.id} onClick={() => { setEditingProject(project); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{project.title}</button>)}</div>
      </nav>}
      {editingProject && <LyricsEditor key={editingProject.id} projectId={editingProject.id} title={editingProject.title} supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} onClose={() => setEditingProject(null)} />}
      <section className="projects"><h2>Your projects</h2>{projects.length === 0 ? <p className="muted">No projects yet.</p> : projects.map((project) => {
        const job = jobs.find((item) => item.project_id === project.id && item.kind !== "render");
        const status = job?.status || project.status;
        const canDelete = ["pending_upload", "failed", "draft", "uploading"].includes(status);
        const stems = assets.filter((asset) => asset.project_id === project.id);
        return <article className="panel project-card" key={project.id}>
          <div className="project"><div><strong>{project.title}</strong><p>{project.artist || "Unknown artist"}</p></div><div className="project-actions"><span className={`status status-${status}`}>{status.replaceAll("_", " ")}</span>{canDelete && <button className="danger" type="button" onClick={() => void deleteProject(project)}>Delete</button>}</div></div>
          {stems.length > 0 && <div className="stem-controls">{(["instrumental", "vocals"] as const).map((kind) => stems.some((asset) => asset.kind === kind) && <div className="stem" key={kind}><span>{kind}</span><button className="secondary compact" disabled={Boolean(trackWorking)} type="button" onClick={() => void trackUrl(project.id, kind, false)}>{trackWorking === `${project.id}-${kind}-play` ? "Opening…" : "Play"}</button><button className="secondary compact" disabled={Boolean(trackWorking)} type="button" onClick={() => void trackUrl(project.id, kind, true)}>{trackWorking === `${project.id}-${kind}-download` ? "Preparing…" : "Download"}</button></div>)}{status === "succeeded" && <button type="button" onClick={() => { setEditingProject(project); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit lyrics & timing</button>}</div>}
          {activeAudio?.projectId === project.id && <div className="audio-player"><span>Playing {activeAudio.kind}</span><audio key={activeAudio.url} controls autoPlay src={activeAudio.url} /></div>}
        </article>;
      })}</section>
    </>
  );
}
