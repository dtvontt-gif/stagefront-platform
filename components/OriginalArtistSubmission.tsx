"use client";

import { FormEvent, useState } from "react";

export default function OriginalArtistSubmission() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const entry = data.get("songFile");
    const file = entry instanceof File && entry.size ? entry : null;
    if (!file) {
      setMessage("Choose your original song file.");
      setBusy(false);
      return;
    }
    setProgress("Preparing secure upload...");
    const ticketResponse = await fetch("/api/originals/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: file.type, size: file.size }),
    });
    const ticket = (await ticketResponse.json()) as {
      message?: string; uploadUrl?: string; path?: string; publicUrl?: string; token?: string | null;
    };
    if (!ticketResponse.ok || !ticket.uploadUrl || !ticket.path || !ticket.publicUrl) {
      setMessage(ticket.message ?? "The upload could not be started.");
      setBusy(false);
      setProgress("");
      return;
    }
    setProgress("Uploading your song...");
    const uploadResponse = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        ...(ticket.token ? { Authorization: `Bearer ${ticket.token}` } : {}),
      },
      body: file,
    });
    if (!uploadResponse.ok) {
      setMessage("The song file did not finish uploading. Please try again.");
      setBusy(false);
      setProgress("");
      return;
    }
    setProgress("Saving your artist story...");
    const response = await fetch("/api/originals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistName: data.get("artistName"),
        songTitle: data.get("songTitle"),
        genre: data.get("genre"),
        artistBio: data.get("artistBio"),
        story: data.get("story"),
        audioPath: ticket.path,
        audioUrl: ticket.publicUrl,
      }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Submission complete.");
    setBusy(false);
    setProgress("");
    if (response.ok) form.reset();
  }

  return (
    <form onSubmit={submit} className="original-submit-form">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field"><span>Artist or stage name</span><input name="artistName" required minLength={2} maxLength={80} placeholder="How fans should know you" /></label>
        <label className="form-field"><span>Song title</span><input name="songTitle" required maxLength={120} placeholder="Title of your original song" /></label>
      </div>
      <label className="form-field"><span>Genre</span><input name="genre" maxLength={80} placeholder="R&B, Soul, Pop, Hip-Hop..." /></label>
      <label className="form-field">
        <span>Upload your original song</span>
        <input name="songFile" type="file" required accept=".mp3,.m4a,.wav,.aac,audio/mpeg,audio/mp4,audio/wav,audio/aac" className="profile-file-input" />
        <small>MP3, M4A, WAV, or AAC. Maximum 50 MB. You must own or control the rights.</small>
      </label>
      <label className="form-field">
        <span>Artist bio</span>
        <textarea name="artistBio" rows={4} maxLength={600} placeholder="Introduce yourself, your sound, and your journey." />
      </label>
      <label className="form-field">
        <span>The story behind the music</span>
        <textarea name="story" rows={8} required minLength={20} maxLength={2000} placeholder="What inspired this song? What did you live through, learn, or hope listeners feel? Tell us why this music deserves to be heard." />
        <small>20–2,000 characters. This story appears with your song if approved.</small>
      </label>
      <label className="original-rights-check">
        <input type="checkbox" required />
        <span>I confirm this is my original music and I have permission to publish it on StageFront.</span>
      </label>
      <button disabled={busy} className="primary-cta disabled:opacity-50">
        {busy ? progress || "Submitting..." : "Submit my original"}
      </button>
      {message ? <p aria-live="polite" className="text-sm text-white/65">{message}</p> : null}
    </form>
  );
}

