"use client";

import { track } from "@vercel/analytics";

const socialLinks = [
  {
    label: "YouTube",
    href: "https://youtube.com/@stagefront-y4e?si=oADuYA04oYFvLWyO",
    color: "hover:border-red-500/60 hover:text-red-400",
  },
  {
    label: "Facebook",
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL,
    color: "hover:border-blue-500/60 hover:text-blue-400",
  },
  {
    label: "Instagram",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    color: "hover:border-pink-500/60 hover:text-pink-400",
  },
  {
    label: "X",
    href: process.env.NEXT_PUBLIC_X_URL,
    color: "hover:border-white/60 hover:text-white",
  },
  {
    label: "Snapchat",
    href: process.env.NEXT_PUBLIC_SNAPCHAT_URL,
    color: "hover:border-yellow-400/60 hover:text-yellow-300",
  },
].filter((link): link is typeof link & { href: string } => Boolean(link.href));

export default function SocialLinks() {
  if (socialLinks.length === 0) return null;

  return (
    <div className="mt-7">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
        Follow StageFront
      </p>
      <div className="flex flex-wrap gap-2.5">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("social_link_clicked", { platform: link.label })}
            className={`rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition ${link.color}`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
