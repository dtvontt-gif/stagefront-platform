"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Token = { id: string; text: string; startMs: number; endMs: number; confidence?: number };
type Line = { id: string; text: string; startMs: number; endMs: number; tokens: Token[] };
type DragMode = "move" | "start" | "end";
type DragState = { lineIndex: number; tokenIndex: number; mode: DragMode; originX: number; original: Token };

const MIN_WORD_MS = 60;

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, milliseconds) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toFixed(2).padStart(5, "0")}`;
}

function recalculateLine(line: Line, tokens: Token[]): Line {
  if (!tokens.length) return { ...line, tokens };
  return { ...line, tokens, startMs: Math.min(...tokens.map((token) => token.startMs)), endMs: Math.max(...tokens.map((token) => token.endMs)) };
}

export default function LyricsEditor({ projectId, title, onClose }: { projectId: string; title: string; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [revision, setRevision] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [currentMs, setCurrentMs] = useState(0);
  const [zoom, setZoom] = useState(80);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [newLyrics, setNewLyrics] = useState("");
  const [autoFollow, setAutoFollow] = useState(true);
  const [working, setWorking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const lastLyricMs = useMemo(() => Math.max(0, ...lines.flatMap((line) => [line.endMs, ...line.tokens.map((token) => token.endMs)])), [lines]);
  const durationMs = Math.max(audioDurationMs, lastLyricMs + 2000, 10000);
  const timelineWidth = Math.max(900, (durationMs / 1000) * zoom);
  const pixelsPerMs = zoom / 1000;
  const tickSeconds = zoom >= 120 ? 1 : zoom >= 60 ? 2 : 5;
  const ticks = useMemo(() => Array.from({ length: Math.ceil(durationMs / (tickSeconds * 1000)) + 1 }, (_, index) => index * tickSeconds), [durationMs, tickSeconds]);
  const orderedWords = useMemo(() => lines.flatMap((line, lineIndex) => line.tokens.map((token, tokenIndex) => ({ token, lineIndex, tokenIndex }))).sort((first, second) => first.token.startMs - second.token.startMs), [lines]);
  const activeWordIndex = orderedWords.findIndex(({ token }) => currentMs >= token.startMs + offsetMs && currentMs <= token.endMs + offsetMs);
  const nextWordIndex = orderedWords.findIndex(({ token }) => currentMs < token.startMs + offsetMs);
  const focusWordIndex = activeWordIndex >= 0 ? activeWordIndex : nextWordIndex >= 0 ? nextWordIndex : Math.max(0, orderedWords.length - 1);
  const followWords = orderedWords.slice(Math.max(0, focusWordIndex - 5), focusWordIndex + 7);

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
      const arrayBuffer = await blob.arrayBuffer();
      try {
        const context = new AudioContext();
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
        const samples = decoded.getChannelData(0);
        const bars = 1200;
        const step = Math.max(1, Math.floor(samples.length / bars));
        const peaks = Array.from({ length: Math.ceil(samples.length / step) }, (_, index) => {
          let peak = 0;
          const end = Math.min(samples.length, (index + 1) * step);
          for (let sampleIndex = index * step; sampleIndex < end; sampleIndex += Math.max(1, Math.floor(step / 40))) peak = Math.max(peak, Math.abs(samples[sampleIndex]));
          return peak;
        });
        const loudest = Math.max(...peaks, 0.01);
        setWaveform(peaks.map((peak) => peak / loudest));
        setAudioDurationMs(Math.round(decoded.duration * 1000));
        await context.close();
      } catch {
        setWaveform([]);
      }
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
    return () => { setAudioUrl((current) => { if (current.startsWith("blob:")) URL.revokeObjectURL(current); return ""; }); };
    // loadAudio is intentionally scoped to this project load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!autoFollow || !timelineRef.current || audioRef.current?.paused) return;
    const viewport = timelineRef.current;
    const playheadX = (currentMs - offsetMs) * pixelsPerMs;
    viewport.scrollTo({ left: Math.max(0, playheadX - viewport.clientWidth * .5), behavior: "auto" });
  }, [autoFollow, currentMs, offsetMs, pixelsPerMs]);

  function seek(milliseconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, (milliseconds + offsetMs) / 1000));
    setCurrentMs(Math.round(audio.currentTime * 1000));
  }

  function startDrag(event: ReactPointerEvent, lineIndex: number, tokenIndex: number, mode: DragMode) {
    if (editingWordId) return;
    event.preventDefault();
    event.stopPropagation();
    const token = lines[lineIndex].tokens[tokenIndex];
    dragRef.current = { lineIndex, tokenIndex, mode, originX: event.clientX, original: { ...token } };
    setSelectedWordId(token.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateWordText(lineIndex: number, tokenIndex: number, text: string) {
    setLines((current) => current.map((line, itemLineIndex) => {
      if (itemLineIndex !== lineIndex) return line;
      const tokens = line.tokens.map((token, itemTokenIndex) => itemTokenIndex === tokenIndex ? { ...token, text } : token);
      return { ...line, tokens, text: tokens.map((token) => token.text.trim()).filter(Boolean).join(" ") };
    }));
  }

  function moveDrag(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaMs = Math.round((event.clientX - drag.originX) / pixelsPerMs);
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== drag.lineIndex) return line;
      const tokens = line.tokens.map((token, tokenIndex) => {
        if (tokenIndex !== drag.tokenIndex) return token;
        if (drag.mode === "start") return { ...token, startMs: Math.max(0, Math.min(drag.original.endMs - MIN_WORD_MS, drag.original.startMs + deltaMs)) };
        if (drag.mode === "end") return { ...token, endMs: Math.max(drag.original.startMs + MIN_WORD_MS, drag.original.endMs + deltaMs) };
        const duration = drag.original.endMs - drag.original.startMs;
        const startMs = Math.max(0, drag.original.startMs + deltaMs);
        return { ...token, startMs, endMs: startMs + duration };
      });
      return recalculateLine(line, tokens);
    }));
  }

  function addLyricsAtPlayhead() {
    const words = newLyrics.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const startMs = Math.max(0, currentMs - offsetMs);
    const id = `line-manual-${Date.now()}`;
    const tokens = words.map((text, index) => ({ id: `${id}-word-${index + 1}`, text, startMs: startMs + index * 550, endMs: startMs + index * 550 + 480 }));
    const line = { id, text: words.join(" "), startMs, endMs: tokens[tokens.length - 1].endMs, tokens };
    setLines((current) => [...current, line].sort((first, second) => first.startMs - second.startMs));
    setSelectedWordId(tokens[0].id);
    setNewLyrics("");
  }

  async function save() {
    setWorking(true); setError(""); setMessage("");
    try {
      const safeOffsetMs = Number.isSafeInteger(offsetMs) ? offsetMs : 0;
      const normalizedLines = lines.map((line) => {
        const tokens = [...line.tokens].sort((first, second) => first.startMs - second.startMs);
        return recalculateLine(line, tokens);
      }).sort((first, second) => first.startMs - second.startMs);
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/lyrics`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, offsetMs: safeOffsetMs, lines: normalizedLines }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save lyrics.");
      setLines(normalizedLines);
      setOffsetMs(safeOffsetMs);
      setRevision(data.revision);
      setMessage(`Saved revision ${data.revision}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save lyrics."); }
    finally { setWorking(false); }
  }

  return <section className="lyrics-editor panel">
    <header className="editor-header"><div><p className="eyebrow">Follow-along lyric editor</p><h2>{title}</h2><p className="muted">Revision {revision || "…"} · {orderedWords.length} words</p></div><button className="secondary compact" onClick={onClose}>Close</button></header>
    <div className="editor-audio"><button className="secondary compact" type="button" disabled={audioLoading} onClick={() => void loadAudio()}>{audioLoading ? "Loading vocals…" : audioUrl ? "Refresh audio" : "Load vocals"}</button>{audioUrl && <audio ref={audioRef} controls preload="metadata" playsInline src={audioUrl} onLoadedMetadata={(event) => setAudioDurationMs(Math.round(event.currentTarget.duration * 1000))} onError={() => setError("The browser could not decode the vocal audio. Try Refresh audio.")} onTimeUpdate={(event) => setCurrentMs(Math.round(event.currentTarget.currentTime * 1000))} />}</div>
    <div className="lyrics-follow" aria-live="polite">{followWords.length ? followWords.map(({ token }) => <button type="button" key={token.id} className={currentMs >= token.startMs + offsetMs && currentMs <= token.endMs + offsetMs ? "current" : ""} onClick={() => seek(token.startMs)}>{token.text}</button>) : <span>Lyrics will appear here as the music plays.</span>}</div>
    <div className="add-lyrics">
      <label>Add a missing word or sentence at {formatTime(Math.max(0, currentMs - offsetMs))}<input value={newLyrics} placeholder="Type the missing lyric…" onChange={(event) => setNewLyrics(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLyricsAtPlayhead(); }} /></label>
      <button type="button" disabled={!newLyrics.trim()} onClick={addLyricsAtPlayhead}>Add at playhead</button>
    </div>
    <div className="timeline-toolbar">
      <span className="time-readout">{formatTime(currentMs)} / {formatTime(durationMs)}</span>
      <label>Zoom<input type="range" min="30" max="240" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <label className="check-field"><input type="checkbox" checked={autoFollow} onChange={(event) => setAutoFollow(event.target.checked)} /> Keep music centered</label>
      <span className="muted">Double-click a word to fix its spelling · drag it for small timing changes</span>
    </div>
    <div className="timeline-viewport" ref={timelineRef}>
      <div className="timeline" style={{ width: timelineWidth }} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onDoubleClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); seek((event.clientX - bounds.left) / pixelsPerMs); }}>
        <div className="time-ruler">{ticks.map((second) => <span key={second} style={{ left: second * zoom }}>{formatTime(second * 1000)}</span>)}</div>
        <div className="waveform" aria-label="Vocal audio waveform" onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); seek((event.clientX - bounds.left) / pixelsPerMs); }}>
          {waveform.length ? waveform.map((peak, index) => <i key={index} style={{ left: `${(index / waveform.length) * 100}%`, height: `${Math.max(4, peak * 92)}%` }} />) : <span>{audioLoading ? "Building waveform…" : "Waveform unavailable — timeline editing still works"}</span>}
        </div>
        <div className="word-tracks"><div className="word-track word-track-continuous">
          {orderedWords.map(({ token, lineIndex, tokenIndex }) => {
            const active = currentMs >= token.startMs + offsetMs && currentMs <= token.endMs + offsetMs;
            return <div key={token.id} className={`word-clip${active ? " playing" : ""}${selectedWordId === token.id ? " selected" : ""}${editingWordId === token.id ? " editing" : ""}`} style={{ left: token.startMs * pixelsPerMs, width: Math.max(12, (token.endMs - token.startMs) * pixelsPerMs) }} onPointerDown={(event) => startDrag(event, lineIndex, tokenIndex, "move")} onDoubleClick={(event) => { event.stopPropagation(); setSelectedWordId(token.id); setEditingWordId(token.id); }} title={`${token.text} · ${formatTime(token.startMs)}–${formatTime(token.endMs)}`}>
              <span className="clip-handle start" onPointerDown={(event) => startDrag(event, lineIndex, tokenIndex, "start")} />
              {editingWordId === token.id ? <input autoFocus aria-label={`Edit word ${token.text}`} value={token.text} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => updateWordText(lineIndex, tokenIndex, event.target.value)} onBlur={() => setEditingWordId(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }} /> : <b>{token.text || "Empty"}</b>}
              <span className="clip-handle end" onPointerDown={(event) => startDrag(event, lineIndex, tokenIndex, "end")} />
            </div>;
          })}
        </div></div>
        <div className="playhead" style={{ left: Math.max(0, (currentMs - offsetMs) * pixelsPerMs) }}><span /></div>
      </div>
    </div>
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
    <details className="offset-details"><summary>Advanced: move every word together</summary><label className="offset-field">Milliseconds<input type="number" value={Number.isFinite(offsetMs) ? offsetMs : ""} onChange={(event) => { const value = Number(event.target.value); setOffsetMs(Number.isFinite(value) ? Math.round(value) : 0); }} /></label></details>
    <div className="editor-actions"><button type="button" disabled={working} onClick={() => void save()}>{working ? "Saving…" : "Save lyric changes"}</button></div>
  </section>;
}
