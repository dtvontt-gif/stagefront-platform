"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Member = {
  username: string;
  display_name: string;
  profile_image_path?: string | null;
};

type Post = {
  id: number;
  body: string;
  created_at: string;
  author: Member;
  comments: { id: number }[];
};

function PostAvatar({ member }: { member: Member }) {
  return (
    <div
      aria-hidden="true"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#f4b400]/35 bg-[#17130b] bg-cover bg-center font-black text-[#f4b400]"
      style={member.profile_image_path ? { backgroundImage: `url(${member.profile_image_path})` } : {}}
    >
      {member.profile_image_path ? null : member.display_name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function CommunityPreview() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/community", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { posts?: Post[] }) => setPosts((data.posts ?? []).slice(0, 3)))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section
      id="community"
      aria-labelledby="community-preview-heading"
      className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,180,0,0.13),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(244,180,0,0.06),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="section-kicker">The community wall</p>
            <h2 id="community-preview-heading" className="section-title">
              More than an audience.
              <span className="block text-stage-gold">A place to belong.</span>
            </h2>
            <p className="section-lede">
              See what singers, artists, hosts, and music fans are sharing. Join the conversation,
              encourage someone, and let the community discover you.
            </p>
          </div>
          <Link href="/community" className="primary-cta shrink-0">
            Open the community wall →
          </Link>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {!loaded
            ? [0, 1, 2].map((item) => (
                <div key={item} className="min-h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]" />
              ))
            : null}
          {loaded && !posts.length ? (
            <Link href="/community" className="feature-card group lg:col-span-3">
              <p className="section-kicker">The stage is open</p>
              <h3 className="mt-8 font-display text-3xl font-black uppercase">Start the conversation.</h3>
              <p className="mt-4 text-white/60">Be the first member to share a song, a thought, or some encouragement.</p>
              <span className="mt-8 inline-flex font-bold text-[#f4b400]">Create a post →</span>
            </Link>
          ) : null}
          {posts.map((post) => (
            <Link
              key={post.id}
              href="/community"
              className="group flex min-h-56 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-[#f4b400]/45 hover:bg-[#f4b400]/[0.055]"
            >
              <header className="flex items-center gap-3">
                <PostAvatar member={post.author} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-white group-hover:text-[#f4b400]">{post.author.display_name}</p>
                  <p className="truncate text-xs text-white/40">@{post.author.username}</p>
                </div>
              </header>
              <p className="mt-5 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-white/72">{post.body}</p>
              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/40">
                <span>{post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}</span>
                <span className="font-bold text-[#f4b400]">Join in →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
