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
};

export default function SocialProfileEditor({ managedUser }: { managedUser?: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading your profile...");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const query = managedUser ? `?user=${encodeURIComponent(managedUser)}` : "";
    const response = await fetch(`/api/social-profile${query}`, { cache: "no-store" });
    const result = await response.json() as { profile?: Profile; message?: string };
    setProfile(result.profile ?? null);
    setMessage(result.message ?? "");
  }, [managedUser]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    if (managedUser) formData.set("managedUserId", managedUser);
    const response = await fetch("/api/social-profile", { method: "PATCH", body: formData });
    const result = await response.json() as { message?: string };
    setMessage(result.message ?? "Profile updated.");
    setBusy(false);
    if (response.ok) await load();
  }

  if (!profile) return <p className="rounded-3xl border border-white/10 bg-white/[.04] p-6 text-white/60">{message}</p>;

  return <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
    <div className="overflow-hidden rounded-[2rem] border border-[#f4b400]/35 bg-white/[.04]">
      <div className="aspect-square bg-cover bg-center" style={profile.profile_image_url ? { backgroundImage: `url(${profile.profile_image_url})` } : {}}>
        {!profile.profile_image_url ? <div className="grid h-full place-items-center text-7xl font-black text-[#f4b400]/40">{profile.display_name[0]}</div> : null}
      </div>
      <div className="p-5"><p className="font-display text-2xl font-black">{profile.display_name}</p><p className="text-[#f4b400]">@{profile.username}</p></div>
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
      <label className="form-field"><span>Profile photo</span><input className="profile-file-input" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {profile.profile_image_url ? <label className="flex gap-3 text-sm text-white/60"><input type="checkbox" name="removePhoto" value="true" />Remove current photo</label> : null}
      <label className="flex gap-3 text-sm text-white/70"><input type="checkbox" name="isPublic" defaultChecked={profile.is_public} />Let other StageFront members discover this profile</label>
      <button disabled={busy} className="primary-cta">{busy ? "Saving..." : "Save profile"}</button>
      {message ? <p aria-live="polite" className="text-sm text-white/60">{message}</p> : null}
    </form>
  </div>;
}
