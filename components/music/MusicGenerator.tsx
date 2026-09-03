"use client";

import { FormEvent, useEffect, useState } from "react";

const SONIC_LOGO_PROMPT = `A premium 10-second concert-stage sonic logo for a brand named StageFront. Real arena drums and low grand piano lead into a warm, expressive electric guitar played through a physical talk box. The guitar clearly articulates the two words "Stage Front" as a memorable melodic phrase. It must sound like a real guitarist and amplifier, not a vocoder, horn, intercom, synth, or toy. Cinematic live-concert energy, polished studio mix, strong musical ending, no copyrighted melody.`;

export default function MusicGenerator({ email, configured }: { email: string; configured: boolean }) {
  const [prompt, setPrompt] = useState(SONIC_LOGO_PROMPT);
  const [duration, setDuration] = useState(10);
  const [instrumental, setInstrumental] = useState(false);
  const [requiredWords, setRequiredWords] = useState("Stage Front");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, durationSeconds: duration, instrumental, requiredWords }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Generation failed." }));
        throw new Error(data.error || "Generation failed.");
      }
      const nextUrl = URL.createObjectURL(await response.blob());
      setAudioUrl((current) => { if (current) URL.revokeObjectURL(current); return nextUrl; });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <header className="studio-header">
      <div><p className="eyebrow">StageFront Music Lab</p><h1>Music generator</h1><p>{email}</p></div>
      <div className="project-actions"><a className="button-link secondary-link" href="/studio">Karaoke studio</a><form action="/api/auth/sign-out" method="post"><button className="secondary">Sign out</button></form></div>
    </header>

    <form className="panel music-generator" onSubmit={generate}>
      <div className="music-preset-header"><div><p className="eyebrow">First instrument</p><h2>StageFront sonic logo</h2></div><button type="button" className="secondary compact" onClick={() => { setPrompt(SONIC_LOGO_PROMPT); setDuration(10); setInstrumental(false); setRequiredWords("Stage Front"); }}>Reset preset</button></div>
      <label>Describe the sound<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4100} rows={8} /></label>
      <label>Required words<input value={requiredWords} onChange={(event) => setRequiredWords(event.target.value)} maxLength={120} placeholder="Leave blank for no required lyrics" /><small>These words are placed directly into the composition instead of being treated as a suggestion.</small></label>
      <div className="music-settings">
        <label>Length: {duration} seconds<input type="range" min="3" max="60" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
        <label className="music-check"><input type="checkbox" checked={instrumental} onChange={(event) => setInstrumental(event.target.checked)} /> Instrumental only</label>
      </div>
      {!configured && <p className="setup-notice">The studio foundation is ready. Add the server-side ElevenLabs API key to enable generation.</p>}
      {error && <p className="error">{error}</p>}
      <button disabled={busy || !configured}>{busy ? "Creating your music…" : "Generate music"}</button>
      {audioUrl && <section className="music-result"><strong>Newest generation</strong><audio controls src={audioUrl} /><a className="button-link" href={audioUrl} download="stagefront-generation.mp3">Download MP3</a></section>}
    </form>
  </>;
}
