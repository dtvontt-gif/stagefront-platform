"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommunityFeed from "@/components/CommunityFeed";
import ZooCrewBadge from "@/components/ZooCrewBadge";

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
  cover_image_url?: string | null;
  wallpaper_image_url?: string | null;
  theme_color?: string;
  profile_layout?: string;
  profile_song_url?: string | null;
  profile_song_title?: string | null;
  tiktok_profile_url?: string | null;
  superfan_supports?: string[];
};

export default function PublicMemberProfile({
  username,
}: {
  username: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading profile...");

  useEffect(() => {
    fetch(`/api/members/${encodeURIComponent(username)}`).then(
      async (response) => {
        const result = (await response.json()) as {
          profile?: Profile;
          message?: string;
        };
        setProfile(result.profile ?? null);
        setMessage(result.message ?? "");
      },
    );
  }, [username]);

  async function connect() {
    if (!profile?.user_id) return;
    const response = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: profile.user_id }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Please try again.");
  }

  if (!profile) return <p className="text-white/60">{message}</p>;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-4 sm:p-8" style={{ backgroundImage: profile.wallpaper_image_url ? `linear-gradient(rgba(4,4,6,.72),rgba(4,4,6,.94)),url(${profile.wallpaper_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center", ["--member-accent" as string]: profile.theme_color || "#f4b400" }}>
      <Link
        href="/members"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.05] px-5 py-3 text-sm font-black text-white transition hover:border-[#f4b400]/55 hover:text-[#f4b400]"
      >
        ← Back to Members
      </Link>
      {profile.cover_image_url ? <div className="mb-8 h-40 rounded-[2rem] bg-cover bg-center sm:h-64" style={{ backgroundImage: `url(${profile.cover_image_url})` }} /> : null}
      <div className={`grid gap-12 ${profile.profile_layout === "classic" ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-[380px_1fr]"}`}>
        <div
          className="aspect-square overflow-hidden rounded-[2.5rem] border border-[#f4b400]/40 bg-[#111118] bg-cover bg-center"
          style={
            profile.profile_image_url
              ? { backgroundImage: `url(${profile.profile_image_url})` }
              : {}
          }
        >
          {!profile.profile_image_url ? (
            <div className="grid h-full place-items-center text-8xl font-black text-[#f4b400]/40">
              {profile.display_name[0]}
            </div>
          ) : null}
        </div>
        <div className="self-center">
          <div className="flex flex-wrap items-center gap-3">
            <p className="section-kicker">{profile.role}</p>
            {profile.superfan_supports?.length ? <ZooCrewBadge /> : null}
          </div>
          <h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">
            {profile.display_name}
          </h1>
          <p className="mt-3 text-xl" style={{ color: profile.theme_color || "#f4b400" }}>@{profile.username}</p>
          {profile.location ? (
            <p className="mt-5 text-white/50">{profile.location}</p>
          ) : null}
          {profile.bio ? (
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {profile.genres ? (
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <strong className="text-[#f4b400]">Genres</strong>
                <p className="mt-2 text-white/65">{profile.genres}</p>
              </div>
            ) : null}
            {profile.looking_for ? (
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <strong className="text-[#f4b400]">
                  Looking to connect for
                </strong>
                <p className="mt-2 text-white/65">{profile.looking_for}</p>
              </div>
            ) : null}
          </div>
          {profile.profile_song_url ? <div className="mt-7 max-w-xl rounded-2xl border border-white/10 bg-black/55 p-4"><p className="mb-3 text-sm font-black uppercase" style={{ color: profile.theme_color || "#f4b400" }}>♫ {profile.profile_song_title || `${profile.display_name}'s profile song`}</p><audio controls preload="none" src={profile.profile_song_url} className="w-full" /></div> : null}
          {profile.tiktok_profile_url ? (
            <a
              href={profile.tiktok_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-full border border-cyan-400/40 px-5 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-black"
            >
              Open TikTok Profile
            </a>
          ) : null}
          {profile.user_id ? (
            <button onClick={connect} className="primary-cta mt-8">
              Request to connect
            </button>
          ) : (
            <p className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm text-white/50">
              This original member profile is managed by StageFront. Interactive
              connections will unlock when the member claims their account.
            </p>
          )}
          {message ? (
            <p className="mt-4 text-sm text-white/55">{message}</p>
          ) : null}
        </div>
      </div>
      {profile.user_id ? (
        <section className="mx-auto mt-20 max-w-3xl border-t border-white/10 pt-12">
          <p className="section-kicker">Profile activity</p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase">
            Notes for {profile.display_name}
          </h2>
          <CommunityFeed
            profileId={profile.user_id}
            composerLabel={`Leave an encouraging note for ${profile.display_name}...`}
          />
        </section>
      ) : null}
    </div>
  );
}
