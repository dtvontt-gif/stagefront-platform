"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Profile = {
  display_name: string;
  username: string;
  role: string;
  bio?: string;
  genres?: string;
  location?: string;
  looking_for?: string;
  is_public: boolean;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  wallpaper_image_url?: string | null;
  theme_color?: string;
  profile_layout?: string;
  profile_song_url?: string | null;
  profile_song_title?: string | null;
};

export default function SocialProfileEditor({ managedUser }: { managedUser?: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading your profile...");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (keepMessage = false) => {
    const query = managedUser ? `?user=${encodeURIComponent(managedUser)}` : "";
    const response = await fetch(`/api/social-profile${query}`, { cache: "no-store" });
    const result = await response.json() as { profile?: Profile; message?: string };
    setProfile(result.profile ?? null);
    if (!keepMessage) setMessage(result.message ?? "");
  }, [managedUser]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-profile-page]");
    if (!page || !profile?.wallpaper_image_url) return;
    const previousBackground = page.style.backgroundImage;
    page.style.backgroundImage = `linear-gradient(rgba(4,4,6,.38),rgba(4,4,6,.82)),url(${profile.wallpaper_image_url})`;
    return () => { page.style.backgroundImage = previousBackground; };
  }, [profile?.wallpaper_image_url]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Preparing your profile…");
    try {
      const formData = new FormData(event.currentTarget);
      const imageFields = ["profilePhoto", "coverPhoto", "wallpaperPhoto"];
      const prepared = await Promise.all(imageFields.map(async (field) => {
        const entry = formData.get(field);
        if (!(entry instanceof File) || !entry.size) return null;
        return { field, file: await withTimeout(mobileSafeImage(entry), 20_000) };
      }));
      for (const item of prepared) {
        if (item) formData.set(item.field, item.file);
      }
      if (managedUser) formData.set("managedUserId", managedUser);
      setMessage("Uploading and saving…");
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 45_000);
      let response: Response;
      try {
        response = await fetch("/api/social-profile", { method: "PATCH", body: formData, signal: controller.signal });
      } finally {
        window.clearTimeout(timer);
      }
      const raw = await response.text();
      let result: { message?: string } = {};
      try { result = raw ? JSON.parse(raw) as { message?: string } : {}; } catch { /* Vercel can return a plain request-size error. */ }
      if (!response.ok) {
        setMessage(result.message || (response.status === 413 ? "Those images are still too large. Try saving one image at a time." : "The profile could not be saved. Please try again."));
        return;
      }
      setMessage(result.message ?? "Profile updated.");
      await load(true);
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "The upload took too long. Check your connection and try saving one image at a time."
        : "The phone could not finish preparing those images. Try saving one image at a time.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <p className="rounded-3xl border border-white/10 bg-white/[.04] p-6 text-white/60">{message}</p>;

  return <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
    <div className="self-start overflow-hidden rounded-[2rem] border bg-black/70" style={{ borderColor: `${profile.theme_color || "#f4b400"}88`, backgroundImage: profile.wallpaper_image_url ? `linear-gradient(#0008,#000b),url(${profile.wallpaper_image_url})` : undefined, backgroundSize: "cover" }}>
      <div className="h-28 bg-cover bg-center" style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})` } : { background: `linear-gradient(135deg,${profile.theme_color || "#f4b400"},#090909)` }} />
      <div className="mx-auto -mt-14 aspect-square w-36 overflow-hidden rounded-full border-4 bg-[#111118] bg-cover bg-center" style={{ borderColor: profile.theme_color || "#f4b400", ...(profile.profile_image_url ? { backgroundImage: `url(${profile.profile_image_url})` } : {}) }}>
        {!profile.profile_image_url ? <div className="grid h-full place-items-center text-5xl font-black" style={{ color: profile.theme_color || "#f4b400" }}>{profile.display_name[0]}</div> : null}
      </div>
      <div className="p-5 text-center"><p className="font-display text-2xl font-black">{profile.display_name}</p><p style={{ color: profile.theme_color || "#f4b400" }}>@{profile.username}</p>{profile.profile_song_url ? <audio controls preload="none" src={profile.profile_song_url} className="mt-4 w-full" /> : null}<a href={`/singers/${profile.username}`} className="mt-5 inline-flex rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs font-black uppercase text-white hover:border-[#f4b400] hover:text-[#f4b400]">View my public profile</a></div>
    </div>
    <form onSubmit={save} className="grid gap-5 rounded-3xl border border-white/10 bg-white/[.035] p-6 sm:p-8">
      {managedUser ? <p className="section-kicker">Administrator editing</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field"><span>Stage name</span><input name="displayName" defaultValue={profile.display_name} required /></label>
        <label className="form-field"><span>Username</span><input name="username" defaultValue={profile.username} required pattern="[a-z0-9_]+" /></label>
      </div>
      <label className="form-field"><span>Singing role</span><select name="role" defaultValue={profile.role}>{["singer", "songwriter", "musician", "producer", "fan", "host"].map((role) => <option key={role}>{role}</option>)}</select></label>
      {managedUser ? <p className="rounded-2xl border border-[#f4b400]/20 bg-[#f4b400]/[.06] p-4 text-sm leading-6 text-white/65">Selecting <strong className="text-[#f4b400]">Host</strong> also creates or updates this person&apos;s Host Discovery listing.</p> : null}
      <label className="form-field"><span>Bio</span><textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={600} rows={5} placeholder="Tell singers what you sound like, what you perform, and what you are building..." /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field"><span>Genres</span><input name="genres" defaultValue={profile.genres ?? ""} placeholder="R&B, Gospel, Country" /></label>
        <label className="form-field"><span>Location</span><input name="location" defaultValue={profile.location ?? ""} placeholder="City, State" /></label>
      </div>
      <label className="form-field"><span>Looking to connect for</span><input name="lookingFor" defaultValue={profile.looking_for ?? ""} placeholder="Duets, songwriting, production, local shows..." /></label>
      <div className="rounded-3xl border border-[#f4b400]/20 bg-black/25 p-5">
        <p className="font-display text-xl font-black uppercase">Design your page</p>
        <p className="mt-2 text-sm text-white/50">Give your profile its own color, cover and wallpaper. Images stay within StageFront&apos;s safe layout.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="form-field"><span>Theme color</span><input name="themeColor" type="color" defaultValue={profile.theme_color || "#f4b400"} className="h-14" /></label>
          <label className="form-field"><span>Page layout</span><select name="profileLayout" defaultValue={profile.profile_layout || "spotlight"}><option value="spotlight">Spotlight</option><option value="classic">Classic social</option><option value="creator">Creator showcase</option></select></label>
          <label className="form-field"><span>Cover image</span><input className="profile-file-input" name="coverPhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label>
          <label className="form-field"><span>Wallpaper</span><input className="profile-file-input" name="wallpaperPhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/60">
          {profile.cover_image_url ? <label className="flex gap-2"><input type="checkbox" name="removeCover" value="true" />Remove cover</label> : null}
          {profile.wallpaper_image_url ? <label className="flex gap-2"><input type="checkbox" name="removeWallpaper" value="true" />Remove wallpaper</label> : null}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
        <p className="font-display text-xl font-black uppercase">Profile song</p>
        <p className="mt-2 text-sm text-white/50">Add a direct HTTPS link to music you own or have permission to share. Visitors press play when they arrive.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="form-field"><span>Song title</span><input name="profileSongTitle" defaultValue={profile.profile_song_title ?? ""} maxLength={120} placeholder="My profile song" /></label>
          <label className="form-field"><span>Audio link</span><input name="profileSongUrl" type="url" defaultValue={profile.profile_song_url ?? ""} placeholder="https://.../song.mp3" /></label>
        </div>
      </div>
      <label className="form-field"><span>Profile photo</span><input className="profile-file-input" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {profile.profile_image_url ? <label className="flex gap-3 text-sm text-white/60"><input type="checkbox" name="removePhoto" value="true" />Remove current photo</label> : null}
      <label className="flex gap-3 text-sm text-white/70"><input type="checkbox" name="isPublic" defaultChecked={profile.is_public} />Let other StageFront members discover this profile</label>
      <button disabled={busy} className="primary-cta">{busy ? "Saving..." : "Save profile"}</button>
      {message ? <p aria-live="polite" className="text-sm text-white/60">{message}</p> : null}
    </form>
  </div>;
}

async function mobileSafeImage(file: File) {
  const maxBytes = 800_000;
  const maxSide = 1400;
  if (file.size <= maxBytes && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("Image could not be opened."));
      candidate.src = url;
    });
    const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image tools unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .76));
    if (!blob) throw new Error("Image could not be resized.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Image preparation timed out.")), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}
