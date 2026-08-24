"use client";

import { useEffect, useRef, useState } from "react";

type Token = { id: string; text: string; startMs: number; endMs: number; confidence?: number };
type Line = { id: string; text: string; startMs: number; endMs: number; tokens: Token[] };

function retimeTokens(line: Line, text: string, startMs: number, endMs: number): Token[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const duration = Math.max(words.length, endMs - startMs);
  return words.map((word, index) => {
    const wordStart = startMs + Math.floor((duration * index) / words.length);
    const wordEnd = startMs + Math.floor((duration * (index + 1)) / words.length);
    return { id: line.tokens[index]?.id || `${line.id}-word-${index + 1}`, text: word, startMs: wordStart, endMs: Math.max(wordStart + 1, wordEnd) };
  });
}

export default function LyricsEditor({ projectId, title, onClose }: { projectId: string; title: string; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [revision, setRevision] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [working, setWorking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  async function loadAudio() {
    setAudioLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/assets/vocals/url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ download: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load vocals.");
      const audioResponse = await fetch(data.url);
      if (!audioResponse.ok) throw new Error(`Audio storage returned ${audioResponse.status}.`);
      const blob = await audioResponse.blob();
      if (!blob.size) throw new Error("The vocal audio file is empty.");
      setAudioUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load vocals.");
    } finally {
      setAudioLoading(false);
    }
  }

  useEffect(() => {
    void fetch(`/api/karaoke-v2/projects/${projectId}/lyrics`, { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load lyrics.");
        setRevision(data.revision);
        setLines(data.project?.lyrics?.lines || []);
        setOffsetMs(data.project?.lyrics?.offsetMs || 0);
      }).then(() => loadAudio())
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not open editor."))
      .finally(() => setWorking(false));
    return () => { if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl); };
    // The audio object URL is replaced and revoked by loadAudio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function updateLine(index: number, changes: Partial<Pick<Line, "text" | "startMs" | "endMs">>) {
    setLines((current) => current.map((line, itemIndex) => {
      if (itemIndex !== index) return line;
      const text = changes.text ?? line.text;
      const startMs = Math.max(0, changes.startMs ?? line.startMs);
      const endMs = Math.max(startMs + 1, changes.endMs ?? line.endMs);
      return { ...line, text, startMs, endMs, tokens: retimeTokens(line, text, startMs, endMs) };
    }));
  }

  function addLine() {
    const startMs = lines.length ? lines[lines.length - 1].endMs + 1 : 0;
    const id = `line-manual-${Date.now()}`;
    setLines((current) => [...current, { id, text: "New lyric line", startMs, endMs: startMs + 3000, tokens: retimeTokens({ id, text: "", startMs, endMs: startMs + 3000, tokens: [] }, "New lyric line", startMs, startMs + 3000) }]);
  }

  async function save() {
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/lyrics`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, offsetMs, lines }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save lyrics.");
      setRevision(data.revision);
      setMessage(`Saved revision ${data.revision}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save lyrics."); }
    finally { setWorking(false); }
  }

  return <section className="lyrics-editor panel">
    <header className="editor-header"><div><p className="eyebrow">Lyrics & timing</p><h2>{title}</h2><p className="muted">Revision {revision || "…"} · {lines.length} lines</p></div><button className="secondary compact" onClick={onClose}>Close</button></header>
    <div className="editor-audio"><button className="secondary compact" type="button" disabled={audioLoading} onClick={() => void loadAudio()}>{audioLoading ? "Loading vocals…" : audioUrl ? "Refresh audio" : "Load vocals"}</button>{audioUrl && <audio ref={audioRef} controls preload="metadata" playsInline src={audioUrl} onError={() => setError("The browser could not decode the vocal audio. Try Refresh audio.")} onTimeUpdate={(event) => setCurrentMs(Math.round(event.currentTarget.currentTime * 1000))} />}</div>
    <label className="offset-field">Global offset (milliseconds)<input type="number" value={offsetMs} onChange={(event) => setOffsetMs(Number(event.target.value))} /></label>
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
    <div className="lyric-lines">{lines.map((line, index) => {
      const active = currentMs >= line.startMs + offsetMs && currentMs <= line.endMs + offsetMs;
      return <div className={`lyric-line${active ? " active" : ""}`} key={line.id}>
        <button className="line-number" type="button" title="Jump to this line" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, (line.startMs + offsetMs) / 1000); }}>{index + 1}</button>
        <textarea value={line.text} rows={2} onChange={(event) => updateLine(index, { text: event.target.value })} />
        <label>Start<input type="number" step="0.01" value={(line.startMs / 1000).toFixed(2)} onChange={(event) => updateLine(index, { startMs: Math.round(Number(event.target.value) * 1000) })} /></label>
        <label>End<input type="number" step="0.01" value={(line.endMs / 1000).toFixed(2)} onChange={(event) => updateLine(index, { endMs: Math.round(Number(event.target.value) * 1000) })} /></label>
        <button className="danger compact" type="button" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Delete</button>
      </div>;
    })}</div>
    <div className="editor-actions"><button className="secondary" type="button" onClick={addLine}>Add line</button><button type="button" disabled={working} onClick={() => void save()}>{working ? "Saving…" : "Save new revision"}</button></div>
  </section>;
}
