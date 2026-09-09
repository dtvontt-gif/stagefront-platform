"use client";

import { useEffect, useState } from "react";
import CommunityFeed from "@/components/CommunityFeed";

type Profile = {
  user_id: string | null;
  username: string;
  display_name: string;
  bio?: string;
  role: string;
  genres?: string;
  location?: string;
  looking_for?: string;
  legacy_profile?: boolean;
  profile_image_url?: string | null;
};

export default function PublicMemberProfile({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading profile...");

  useEffect(() => {
    fetch(`/api/members/${encodeURIComponent(username)}`).then(async (response) => {
      const result = await response.json() as { profile?: Profile; message?: string };
      setProfile(result.profile ?? null);
      setMessage(result.message ?? "");
    });
  }, [username]);

  async function connect() {
    if (!profile?.user_id) return;
    const response = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: profile.user_id }),
    });
    const result = await response.json() as { message?: string };
    setMessage(result.message ?? "Please try again.");
  }

  if (!profile) return <p className="text-white/60">{message}</p>;

  return <>
    <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
      <div className="aspect-square overflow-hidden rounded-[2.5rem] border border-[#f4b400]/40 bg-[#111118] bg-cover bg-center" style={profile.profile_image_url ? { backgroundImage: `url(${profile.profile_image_url})` } : {}}>
        {!profile.profile_image_url ? <div className="grid h-full place-items-center text-8xl font-black text-[#f4b400]/40">{profile.display_name[0]}</div> : null}
      </div>
      <div className="self-center">
        <p className="section-kicker">{profile.role}</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">{profile.display_name}</h1>
        <p className="mt-3 text-xl text-[#f4b400]">@{profile.username}</p>
        {profile.location ? <p className="mt-5 text-white/50">{profile.location}</p> : null}
        {profile.bio ? <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">{profile.bio}</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {profile.genres ? <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><strong className="text-[#f4b400]">Genres</strong><p className="mt-2 text-white/65">{profile.genres}</p></div> : null}
          {profile.looking_for ? <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><strong className="text-[#f4b400]">Looking to connect for</strong><p className="mt-2 text-white/65">{profile.looking_for}</p></div> : null}
        </div>
        {profile.user_id ? <button onClick={connect} className="primary-cta mt-8">Request to connect</button> : (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm text-white/50">This original member profile is managed by StageFront. Interactive connections will unlock when the member claims their account.</p>
        )}
        {message ? <p className="mt-4 text-sm text-white/55">{message}</p> : null}
      </div>
    </div>
    {profile.user_id ? (
      <section className="mx-auto mt-20 max-w-3xl border-t border-white/10 pt-12">
        <p className="section-kicker">Profile activity</p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase">Notes for {profile.display_name}</h2>
        <CommunityFeed profileId={profile.user_id} composerLabel={`Leave an encouraging note for ${profile.display_name}...`} />
      </section>
    ) : null}
  </>;
}
