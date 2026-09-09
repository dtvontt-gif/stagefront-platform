"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = {
  user_id: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  is_public: boolean;
  profile_image_url?: string | null;
  tiktok_profile_url?: string | null;
};

export default function AdminMemberProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading account profiles...");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/member-profiles", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { profiles?: Profile[]; message?: string };
      if (active) {
        setProfiles(result.profiles ?? []);
        setMessage(result.message ?? "");
      }
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? profiles.filter((profile) => [profile.display_name, profile.username, profile.email, profile.role].some((value) => value.toLowerCase().includes(query)))
      : profiles;
  }, [profiles, search]);

  async function editTikTok(profile: Profile) {
    const link = window.prompt("Paste the complete TikTok profile link:", profile.tiktok_profile_url ?? "");
    if (link === null) return;
    const response = await fetch("/api/admin/member-profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.user_id, tiktokUrl: link }),
    });
    const result = await response.json() as { message?: string };
    setMessage(result.message ?? "TikTok link updated.");
    if (response.ok) setProfiles((current) => current.map((item) => item.user_id === profile.user_id ? { ...item, tiktok_profile_url: link.trim() || null } : item));
  }

  return <section id="member-profiles" className="mx-auto w-full max-w-6xl scroll-mt-8">
    <p className="section-kicker">New member accounts</p>
    <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Account <span className="text-stage-gold">Profiles.</span></h2>
    <p className="mt-4 max-w-3xl text-white/55">Manage every profile created through a StageFront login. These are separate from the original Founding Member records listed below.</p>
    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search account profiles" className="mt-7 w-full rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm text-white outline-none focus:border-[#f4b400] sm:max-w-sm" />
    {message ? <p className="mt-5 text-sm text-white/60">{message}</p> : null}
    <div className="mt-6 overflow-hidden rounded-3xl border border-white/10"><div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
        <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-white/50"><tr><th className="px-5 py-4">Member</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Visibility</th><th className="px-5 py-4">Control</th></tr></thead>
        <tbody className="divide-y divide-white/10 bg-black/20">
          {filtered.map((profile) => <tr key={profile.user_id}>
            <td className="px-5 py-4"><div className="flex items-center gap-3">{profile.profile_image_url ? <div className="h-12 w-12 shrink-0 rounded-lg border border-[#f4b400]/40 bg-cover bg-center" style={{ backgroundImage: `url(${profile.profile_image_url})` }} /> : null}<div><p className="font-bold">{profile.display_name}</p><p className="mt-1 text-white/45">@{profile.username} · {profile.email}</p></div></div></td>
            <td className="px-5 py-4 capitalize text-white/70">{profile.role}</td>
            <td className="px-5 py-4"><span className={profile.is_public ? "text-emerald-300" : "text-white/40"}>{profile.is_public ? "Public" : "Private"}</span></td>
            <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><a href={`/profile?user=${encodeURIComponent(profile.user_id)}`} className="inline-flex rounded-full bg-[#f4b400] px-4 py-2 font-black text-black">Manage Profile</a><button type="button" onClick={() => void editTikTok(profile)} className="rounded-full border border-cyan-400/35 px-4 py-2 font-bold text-cyan-200">{profile.tiktok_profile_url ? "Edit TikTok" : "Add TikTok"}</button></div></td>
          </tr>)}
        </tbody>
      </table>
    </div>{!filtered.length ? <p className="px-6 py-12 text-center text-white/45">No matching account profiles.</p> : null}</div>
  </section>;
}
