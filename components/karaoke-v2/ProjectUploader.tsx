"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Project = { id: string; title: string; artist: string | null; status: string; created_at: string };
type Job = { id: string; project_id: string; status: string; progress: number | null; error: string | null };
const FALLBACK_MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", m4a: "audio/mp4", mp4: "audio/mp4",
};

export default function ProjectUploader({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/karaoke-v2/projects", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setProjects(data.projects || []);
      setJobs(data.jobs || []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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

      const createResponse = await fetch("/api/karaoke-v2/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.get("title"), artist: form.get("artist") }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error || "Could not create project.");
      const projectId = created.project.id as string;

      const extension = file.name.split(".").pop()?.toLowerCase();
      const mimeType = file.type || FALLBACK_MIME[extension || ""] || "";
      const signResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType, size: file.size }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || "Could not prepare upload.");

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase browser configuration is missing.");
      const client = createClient(url, key, { auth: { persistSession: false } });
      const { error: uploadError } = await client.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const completeResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: signed.path, fileName: file.name, mimeType, size: file.size }),
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
      <section className="projects"><h2>Your projects</h2>{projects.length === 0 ? <p className="muted">No projects yet.</p> : projects.map((project) => {
        const job = jobs.find((item) => item.project_id === project.id);
        return <article className="panel project" key={project.id}><div><strong>{project.title}</strong><p>{project.artist || "Unknown artist"}</p></div><span className={`status status-${job?.status || project.status}`}>{(job?.status || project.status).replaceAll("_", " ")}</span></article>;
      })}</section>
    </>
  );
}
