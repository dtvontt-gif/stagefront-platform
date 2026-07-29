"use client";

import { useCallback, useEffect, useState } from "react";

type Winner = {
  id: number;
  display_name: string;
  competition: "box_battle" | "golden_voices";
  title: string;
  season_label: string;
  bio: string;
  photo_url: string | null;
  video_url: string | null;
  social_url: string | null;
  featured: boolean;
  published: boolean;
  won_at: string | null;
  display_order: number;
};

type WinnerForm = Omit<Winner, "id">;

const emptyForm: WinnerForm = {
  display_name: "",
  competition: "box_battle",
  title: "Champion",
  season_label: "",
  bio: "",
  photo_url: null,
  video_url: null,
  social_url: null,
  featured: false,
  published: true,
  won_at: null,
  display_order: 0,
};

export default function AdminWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [form, setForm] = useState<WinnerForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("Loading winners...");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/winners", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { winners?: Winner[]; message?: string }) => {
        setWinners(result.winners ?? []);
        setMessage(result.message ?? "");
      });
  }, []);

  useEffect(() => load(), [load]);

  function edit(winner: Winner) {
    setEditingId(winner.id);
    setForm({
      display_name: winner.display_name,
      competition: winner.competition,
      title: winner.title,
      season_label: winner.season_label,
      bio: winner.bio,
      photo_url: winner.photo_url,
      video_url: winner.video_url,
      social_url: winner.social_url,
      featured: winner.featured,
      published: winner.published,
      won_at: winner.won_at,
      display_order: winner.display_order,
    });
    setPhoto(null);
    setPhotoPreview(winner.photo_url);
    document.getElementById("winner-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setPhoto(null);
    setPhotoPreview(null);
  }

  async function save() {
    setBusy(true);
    const data = new FormData();
    if (editingId) data.set("id", String(editingId));
    data.set("displayName", form.display_name);
    data.set("competition", form.competition);
    data.set("title", form.title);
    data.set("seasonLabel", form.season_label);
    data.set("bio", form.bio);
    data.set("existingPhotoUrl", form.photo_url ?? "");
    data.set("videoUrl", form.video_url ?? "");
    data.set("socialUrl", form.social_url ?? "");
    data.set("featured", String(form.featured));
    data.set("published", String(form.published));
    data.set("wonAt", form.won_at ?? "");
    data.set("displayOrder", String(form.display_order));
    if (photo) data.set("photo", photo);
    const response = await fetch("/api/admin/winners", {
      method: editingId ? "PATCH" : "POST",
      body: data,
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Winner saved.");
    setBusy(false);
    if (response.ok) {
      reset();
      load();
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this winner spotlight?")) return;
    setBusy(true);
    const response = await fetch("/api/admin/winners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Winner removed.");
    setBusy(false);
    if (response.ok) load();
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Hall of champions</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">
        Winner <span className="text-stage-gold">Spotlights.</span>
      </h2>
      <p className="mt-4 max-w-3xl text-white/55">
        Add Box Battle and Golden Voices champions. “Featured” places that winner
        in the main homepage spotlight. YouTube links play directly on StageFront.
      </p>

      <div id="winner-editor" className="mt-8 grid gap-5 rounded-3xl border border-[#f4b400]/20 bg-white/[0.035] p-5 sm:p-7 lg:grid-cols-2">
        <label className="form-field"><span>Winner name</span><input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} placeholder="Artist or performer name" /></label>
        <label className="form-field">
          <span>Competition</span>
          <select value={form.competition} onChange={(event) => setForm({ ...form, competition: event.target.value as WinnerForm["competition"] })}>
            <option value="box_battle">Box Battle</option>
            <option value="golden_voices">Golden Voices</option>
          </select>
        </label>
        <label className="form-field"><span>Winner title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Grand Champion" /></label>
        <label className="form-field"><span>Season or event</span><input value={form.season_label} onChange={(event) => setForm({ ...form, season_label: event.target.value })} placeholder="Season One · July 2026" /></label>
        <label className="form-field lg:col-span-2"><span>Small bio</span><textarea rows={5} maxLength={600} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Tell the community what makes this winner special..." /></label>
        <label className="form-field">
          <span>Winner photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="profile-file-input"
            onChange={(event) => {
              const nextPhoto = event.target.files?.[0] ?? null;
              setPhoto(nextPhoto);
              setPhotoPreview(nextPhoto ? URL.createObjectURL(nextPhoto) : form.photo_url);
            }}
          />
          <small>JPG, PNG, or WebP. Maximum 5 MB.</small>
        </label>
        <div className="winner-admin-preview">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Winner photo preview" />
          ) : (
            <span>Photo preview</span>
          )}
        </div>
        <label className="form-field"><span>Performance video</span><input type="url" value={form.video_url ?? ""} onChange={(event) => setForm({ ...form, video_url: event.target.value || null })} placeholder="YouTube or other video link" /><small>YouTube videos play directly on the website.</small></label>
        <label className="form-field"><span>Artist profile or social link</span><input type="url" value={form.social_url ?? ""} onChange={(event) => setForm({ ...form, social_url: event.target.value || null })} placeholder="https://..." /></label>
        <label className="form-field"><span>Date won</span><input type="date" value={form.won_at ?? ""} onChange={(event) => setForm({ ...form, won_at: event.target.value || null })} /></label>
        <label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} className="h-6 w-6 accent-[#f4b400]" />Feature on the main spotlight</label>
        <label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="h-6 w-6 accent-[#f4b400]" />Visible to the public</label>
        <div className="flex flex-wrap gap-3 lg:col-span-2">
          <button type="button" disabled={busy} onClick={() => void save()} className="primary-cta">{editingId ? "Save winner changes" : "Add winner spotlight"}</button>
          {editingId ? <button type="button" disabled={busy} onClick={reset} className="secondary-cta">Cancel editing</button> : null}
        </div>
      </div>

      {message ? <p aria-live="polite" className="mt-5 text-sm text-white/55">{message}</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {winners.map((winner) => (
          <article key={winner.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f4b400]">{winner.competition === "box_battle" ? "Box Battle" : "Golden Voices"}</p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase">{winner.display_name}</h3>
                <p className="mt-1 text-sm text-white/55">{winner.title}</p>
              </div>
              {winner.featured ? <span className="pill">Featured</span> : null}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => edit(winner)} className="secondary-cta">Edit</button>
              <button type="button" disabled={busy} onClick={() => void remove(winner.id)} className="rounded-full border border-red-400/40 px-5 py-3 text-sm font-black text-red-300">Remove</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
