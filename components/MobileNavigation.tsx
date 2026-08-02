"use client";

import { useState } from "react";

type LinkItem = { label: string; href: string };

export default function MobileNavigation({
  links,
  signedIn,
  staff,
}: {
  links: LinkItem[];
  signedIn: boolean;
  staff: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-stagefront-menu"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f4b400]/45 bg-black/40 text-[#f4b400]"
      >
        <span className="text-xl leading-none">{open ? "×" : "☰"}</span>
      </button>
      {open ? (
        <>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 top-20 z-40 bg-black/65 backdrop-blur-sm" />
          <div id="mobile-stagefront-menu" className="fixed inset-x-3 top-24 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-[#f4b400]/25 bg-[#0b0b0f]/[0.98] p-4 shadow-2xl">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {links.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3.5 text-sm font-bold text-white/75 transition hover:bg-white/[0.06] hover:text-[#f4b400]">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="my-3 h-px bg-white/10" />
            <div className="grid gap-2">
              <a href="/backstage" className="rounded-xl border border-[#f4b400]/45 bg-[#f4b400]/[0.06] px-4 py-3.5 text-center text-sm font-black uppercase tracking-wider text-[#f4b400]">
                Backstage Pass
              </a>
              {signedIn ? (
                <>
                  <a href="/profile" className="rounded-xl bg-[#f4b400] px-4 py-3.5 text-center text-sm font-black text-black">My Profile</a>
                  {staff ? <a href="/admin" className="rounded-xl border border-[#f4b400]/40 px-4 py-3.5 text-center text-sm font-bold text-[#f4b400]">Admin Dashboard</a> : null}
                  <form action="/api/auth/sign-out" method="post">
                    <button className="w-full rounded-xl border border-white/15 px-4 py-3.5 text-sm font-bold text-white/60">Sign Out</button>
                  </form>
                </>
              ) : (
                <>
                  <a href="/sign-in" className="rounded-xl bg-[#f4b400] px-4 py-3.5 text-center text-sm font-black text-black">Sign In</a>
                  <a href="/join" className="rounded-xl border border-[#f4b400]/40 px-4 py-3.5 text-center text-sm font-bold text-[#f4b400]">Become a Founding Member</a>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
