"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import KaraokePreview, { PreviewStyle } from "@/components/karaoke-v2/KaraokePreview";

type Token = { id: string; text: string; startMs: number; endMs: number; confidence?: number };
type Line = { id: string; text: string; startMs: number; endMs: number; tokens: Token[] };
type DragMode = "move" | "start" | "end";
type DragState = { lineIndex: number; tokenIndex: number; mode: DragMode; originX: number; original: Token };
type RenderJob = { id: string; status: string; progress: number | null; error?: string | null };

const MIN_WORD_MS = 60;
const MAX_INSTRUMENTAL_BYTES = 250 * 1024 * 1024;
const INSTRUMENTAL_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/x-wav"]);
const INSTRUMENTAL_MIME: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav" };
const MAX_BACKGROUND_BYTES = 15 * 1024 * 1024;
const BACKGROUND_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, milliseconds) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toFixed(2).padStart(5, "0")}`;
}

function recalculateLine(line: Line, tokens: Token[]): Line {
  if (!tokens.length) return { ...line, tokens };
  return { ...line, tokens, startMs: Math.min(...tokens.map((token) => token.startMs)), endMs: Math.max(...tokens.map((token) => token.endMs)) };
}

export default function LyricsEditor({ projectId, title, supabaseUrl, supabaseAnonKey, onClose }: { projectId: string; title: string; supabaseUrl: string; supabaseAnonKey: string; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [revision, setRevision] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(80);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [newLyrics, setNewLyrics] = useState("");
  const [previewStyle, setPreviewStyle] = useState<PreviewStyle>({ activeColor: "#f4b400", inactiveColor: "#ffffff", backgroundColor: "#08080b", fontSize: 52, verticalPosition: "bottom" });
  const [autoFollow, setAutoFollow] = useState(true);
  const [working, setWorking] = useState(true);
  const [exportWorking, setExportWorking] = useState("");
  const [backgroundWorking, setBackgroundWorking] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [renderReady, setRenderReady] = useState(false);
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
      const render = data.project?.render || {};
      setPreviewStyle({
        activeColor: render.activeColor || "#f4b400",
        inactiveColor: render.inactiveColor || "#ffffff",
        backgroundColor: render.backgroundColor || "#08080b",
        backgroundImagePath: render.backgroundImagePath || undefined,
        fontSize: Number(render.fontSize) || 52,
        verticalPosition: ["top", "center", "bottom"].includes(render.verticalPosition) ? render.verticalPosition : "bottom",
      });
      if (render.backgroundImagePath) {
        const imageResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/background/url`, { method: "POST" });
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          setPreviewStyle((style) => ({ ...style, backgroundImageUrl: image.url }));
        }
      }
    }).then(() => loadAudio())
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not open editor."))
      .finally(() => setWorking(false));
    return () => { setAudioUrl((current) => { if (current.startsWith("blob:")) URL.revokeObjectURL(current); return ""; }); };
    // loadAudio is intentionally scoped to this project load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    let active = true;
    async function loadRender() {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/export/render`, { cache: "no-store" });
      if (!response.ok || !active) return;
      const data = await response.json();
      setRenderJob(data.job || null);
      setRenderReady(Boolean(data.render));
    }
    void loadRender();
    const refresh = window.setInterval(() => void loadRender(), 10000);
    return () => { active = false; window.clearInterval(refresh); };
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

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("The browser could not start playback. Try Refresh audio.");
      }
    } else {
      audio.pause();
    }
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
      const saveRequest = () => fetch(`/api/karaoke-v2/projects/${projectId}/lyrics`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, offsetMs: safeOffsetMs, lines: normalizedLines, render: previewStyle }),
      });
      let response = await saveRequest();
      if (response.status === 401) {
        const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshed.ok) response = await saveRequest();
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save lyrics.");
      setLines(normalizedLines);
      setOffsetMs(safeOffsetMs);
      setRevision(data.revision);
      setMessage(`Saved revision ${data.revision}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save lyrics."); }
    finally { setWorking(false); }
  }

  function downloadSubtitles() {
    const link = document.createElement("a");
    link.href = `/api/karaoke-v2/projects/${projectId}/export/ass`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function downloadInstrumental() {
    setExportWorking("instrumental");
    setError("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/assets/instrumental/url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ download: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare the instrumental.");
      const link = document.createElement("a");
      link.href = result.url;
      link.download = `${title}-instrumental.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download the instrumental.");
    } finally {
      setExportWorking("");
    }
  }

  async function replaceInstrumental(file: File) {
    setExportWorking("replace-instrumental");
    setError("");
    setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const mimeType = file.type || INSTRUMENTAL_MIME[extension] || "";
      if (!file.size || file.size > MAX_INSTRUMENTAL_BYTES || !INSTRUMENTAL_TYPES.has(mimeType)) {
        throw new Error("Choose the Suno instrumental as an MP3 or WAV file under 250 MB.");
      }
      const signResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/custom-instrumental/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType, size: file.size }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || "Could not prepare the instrumental upload.");

      const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const storageMimeType = mimeType === "audio/x-wav" ? "audio/wav" : mimeType;
      const { error: uploadError } = await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: storageMimeType,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;

      const completeResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/custom-instrumental/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: signed.path, fileName: file.name, mimeType: storageMimeType, size: file.size }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Could not save the replacement instrumental.");
      setMessage("Suno instrumental saved for this song. Save your caption style, then create the updated MP4.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not replace the instrumental.");
    } finally {
      setExportWorking("");
    }
  }

  async function uploadBackground(file: File) {
    setBackgroundWorking(true);
    setError("");
    setMessage("");
    try {
      if (!file.size || file.size > MAX_BACKGROUND_BYTES || !BACKGROUND_TYPES.has(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP image under 15 MB.");
      }
      const signResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/background/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mimeType: file.type, size: file.size }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || "Could not prepare the background upload.");
      const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { error: uploadError } = await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type, cacheControl: "3600",
      });
      if (uploadError) throw uploadError;
      const imageResponse = await fetch(`/api/karaoke-v2/projects/${projectId}/background/url`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: signed.path }) });
      const image = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(image.error || "Could not open the background image.");
      setPreviewStyle((style) => ({ ...style, backgroundImagePath: signed.path, backgroundImageUrl: image.url }));
      setMessage("Background image uploaded. Click Save lyric changes to keep it with this song.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload the background image.");
    } finally {
      setBackgroundWorking(false);
    }
  }

  async function createVideo() {
    setExportWorking("render");
    setError("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/export/render`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start the video render.");
      setRenderJob(result.job);
      setMessage(result.alreadyQueued ? "Your karaoke video is already being created." : "Karaoke video queued. You can leave this page while it renders.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the video render.");
    } finally {
      setExportWorking("");
    }
  }

  async function downloadVideo() {
    setExportWorking("video");
    setError("");
    try {
      const response = await fetch(`/api/karaoke-v2/projects/${projectId}/assets/render/url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ download: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare the karaoke video.");
      const link = document.createElement("a");
      link.href = result.url;
      link.download = `${title}-karaoke.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download the karaoke video.");
    } finally {
      setExportWorking("");
    }
  }

  return <section className="lyrics-editor panel">
    <header className="editor-header"><div><p className="eyebrow">Follow-along lyric editor</p><h2>{title}</h2><p className="muted">Revision {revision || "…"} · {orderedWords.length} words</p></div><button className="secondary compact" onClick={onClose}>Close</button></header>
    <div className="editor-audio"><button className="secondary compact" type="button" disabled={audioLoading} onClick={() => void loadAudio()}>{audioLoading ? "Loading vocals…" : audioUrl ? "Refresh audio" : "Load vocals"}</button>{audioUrl && <audio ref={audioRef} controls preload="metadata" playsInline src={audioUrl} onLoadedMetadata={(event) => setAudioDurationMs(Math.round(event.currentTarget.duration * 1000))} onError={() => setError("The browser could not decode the vocal audio. Try Refresh audio.")} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onTimeUpdate={(event) => setCurrentMs(Math.round(event.currentTarget.currentTime * 1000))} />}</div>
    <KaraokePreview lines={lines} currentMs={currentMs} offsetMs={offsetMs} style={previewStyle} />
    <div className="preview-controls">
      <label>Sung words<input type="color" value={previewStyle.activeColor} onChange={(event) => setPreviewStyle((current) => ({ ...current, activeColor: event.target.value }))} /></label>
      <label>Upcoming words<input type="color" value={previewStyle.inactiveColor} onChange={(event) => setPreviewStyle((current) => ({ ...current, inactiveColor: event.target.value }))} /></label>
      <label>Background<input type="color" value={previewStyle.backgroundColor} onChange={(event) => setPreviewStyle((current) => ({ ...current, backgroundColor: event.target.value }))} /></label>
      <label className="background-image-control">Background image<div className="background-image-buttons"><span className="file-button secondary compact">{backgroundWorking ? "Uploading…" : previewStyle.backgroundImagePath ? "Replace image" : "Upload image"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={backgroundWorking} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); event.currentTarget.value = ""; }} /></span>{previewStyle.backgroundImagePath && <button className="secondary compact" type="button" onClick={() => setPreviewStyle((style) => ({ ...style, backgroundImagePath: undefined, backgroundImageUrl: undefined }))}>Remove image</button>}</div></label>
      <label>Text size<input type="range" min="28" max="96" step="2" value={previewStyle.fontSize} onChange={(event) => setPreviewStyle((current) => ({ ...current, fontSize: Number(event.target.value) }))} /></label>
      <label>Position<select value={previewStyle.verticalPosition} onChange={(event) => setPreviewStyle((current) => ({ ...current, verticalPosition: event.target.value as PreviewStyle["verticalPosition"] }))}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
    </div>
    <div className="lyrics-follow" aria-live="polite">{followWords.length ? followWords.map(({ token }) => <button type="button" key={token.id} className={currentMs >= token.startMs + offsetMs && currentMs <= token.endMs + offsetMs ? "current" : ""} onClick={() => seek(token.startMs)}>{token.text}</button>) : <span>Lyrics will appear here as the music plays.</span>}</div>
    <div className="add-lyrics">
      <label>Add a missing word or sentence at {formatTime(Math.max(0, currentMs - offsetMs))}<input value={newLyrics} placeholder="Type the missing lyric…" onChange={(event) => setNewLyrics(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLyricsAtPlayhead(); }} /></label>
      <button type="button" disabled={!newLyrics.trim()} onClick={addLyricsAtPlayhead}>Add at playhead</button>
    </div>
    <div className="timeline-toolbar">
      <span className="time-readout">{formatTime(currentMs)} / {formatTime(durationMs)}</span>
      <label>Zoom<input type="range" min="30" max="240" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <label className="check-field"><input type="checkbox" checked={autoFollow} onChange={(event) => setAutoFollow(event.target.checked)} /> Keep music centered</label>
      <button className={`timeline-play ${isPlaying ? "playing" : ""}`} type="button" disabled={!audioUrl} aria-label={isPlaying ? "Pause audio" : "Play audio"} aria-pressed={isPlaying} onClick={() => void togglePlayback()}>{isPlaying ? "❚❚ Pause" : "▶ Play"}</button>
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
    <section className="export-panel">
      <div><p className="eyebrow">Export</p><h3>Karaoke files</h3><p className="muted">Save first, then download the timed karaoke subtitles and instrumental audio.</p></div>
      <div className="custom-instrumental"><div><strong>Use your own instrumental for this song</strong><p className="muted">This keeps your saved lyrics and timing and skips the separator.</p></div><label className="file-button secondary">{exportWorking === "replace-instrumental" ? "Uploading instrumental…" : "Choose Suno instrumental"}<input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" disabled={Boolean(exportWorking)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceInstrumental(file); event.currentTarget.value = ""; }} /></label></div>
      {renderJob && <p className={`render-status status-${renderJob.status}`}>Video: {renderJob.status}{renderJob.status === "running" && renderJob.progress !== null ? ` · ${Math.round(renderJob.progress * 100)}%` : ""}{renderJob.error ? ` · ${renderJob.error}` : ""}</p>}
      <div className="export-actions"><button className="secondary" type="button" onClick={downloadSubtitles}>Download subtitles</button><button className="secondary" type="button" disabled={Boolean(exportWorking)} onClick={() => void downloadInstrumental()}>Download instrumental</button>{renderReady && <button className="secondary" type="button" disabled={Boolean(exportWorking)} onClick={() => void downloadVideo()}>Download MP4</button>}<button type="button" disabled={Boolean(exportWorking) || renderJob?.status === "queued" || renderJob?.status === "running"} onClick={() => void createVideo()}>{exportWorking === "render" ? "Starting…" : renderReady ? "Create updated MP4" : "Create MP4 video"}</button></div>
    </section>
  </section>;
}
