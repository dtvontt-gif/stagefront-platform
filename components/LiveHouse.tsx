"use client";

import { useState } from "react";

type RoomState = "idle" | "opening" | "ready" | "error";

export default function LiveHouse() {
  const [state, setState] = useState<RoomState>("idle");
  const [roomUrl, setRoomUrl] = useState("");
  const [message, setMessage] = useState("");
  const [owner, setOwner] = useState(false);

  async function enterRoom() {
    setState("opening");
    setMessage("");
    const response = await fetch("/api/live/room", { method: "POST" });
    const result = (await response.json().catch(() => ({}))) as { roomUrl?: string; message?: string; isOwner?: boolean };
    if (!response.ok || !result.roomUrl) {
      setState("error");
      setMessage(result.message || "The Live House could not open.");
      return;
    }
    setRoomUrl(result.roomUrl);
    setOwner(Boolean(result.isOwner));
    setState("ready");
  }

  return (
    <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-3 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[#050705]" />
      <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_16%_15%,rgba(34,197,94,.13),transparent_27%),radial-gradient(circle_at_82%_13%,rgba(244,180,0,.16),transparent_28%),linear-gradient(180deg,#07110b_0%,#050505_48%,#0c0904_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-25 [background-image:repeating-linear-gradient(112deg,transparent_0_38px,rgba(97,69,39,.8)_40px_44px,transparent_46px_95px)]" />
      <div className="relative mx-auto max-w-[1700px]">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap gap-3"><span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] ${state === "ready" ? "border-red-400/40 bg-red-500/15 text-red-200" : "border-[#f4b400]/30 bg-[#f4b400]/10 text-[#f4b400]"}`}>{state === "ready" ? "Exhibit open · Live" : "After-hours private beta"}</span><span className="rounded-full border border-emerald-500/25 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-emerald-200">Visitor viewing gallery</span></div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase sm:text-6xl">Zoo Crew Live House</h1>
            <p className="mt-3 max-w-3xl text-white/60">Step up to the glass and enter the official nighttime habitat of the Zoo Crew family.</p>
          </div>
          {state !== "ready" ? <button onClick={enterRoom} disabled={state === "opening"} className="primary-cta disabled:opacity-50">{state === "opening" ? "Opening the gate…" : "Enter viewing gallery"}</button> : <span className="rounded-full border border-[#f4b400]/25 bg-black/55 px-4 py-2 text-sm font-bold text-[#f4b400]">{owner ? "Zookeeper control center" : "Visitor access"}</span>}
        </header>

        {state === "ready" ? (
          <div className="relative rounded-[2.5rem] border-[10px] border-[#20170c] bg-[#120d07] p-2 shadow-[0_0_0_2px_rgba(244,180,0,.35),0_35px_90px_rgba(0,0,0,.8)] sm:border-[18px] sm:p-3">
            <div className="absolute inset-x-12 -top-7 z-20 mx-auto w-fit rounded-lg border border-[#d8a729]/50 bg-[#171006] px-7 py-2 text-center shadow-xl"><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#d9b75f]">Zoo Crew Wildlife Pavilion</p><p className="font-display text-sm font-black uppercase text-white">Main Habitat Observation Glass</p></div>
            <div className="relative overflow-hidden rounded-2xl border border-cyan-100/20 bg-black">
              <iframe title="Zoo Crew Live House" src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[78vh] min-h-[620px] w-full border-0" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 opacity-35 [background-image:linear-gradient(112deg,transparent_0%,rgba(210,245,255,.08)_22%,transparent_36%,transparent_62%,rgba(255,255,255,.06)_73%,transparent_87%),radial-gradient(circle_at_18%_24%,rgba(255,255,255,.09),transparent_12%),radial-gradient(circle_at_86%_72%,rgba(163,230,255,.06),transparent_15%)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 z-10 w-px bg-cyan-100/10 shadow-[0_0_15px_rgba(220,250,255,.18)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-1/3 z-10 w-px bg-cyan-100/10 shadow-[0_0_15px_rgba(220,250,255,.18)]" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/40"><span>Do not tap on the glass</span><span className="text-[#d9b75f]">Visitors inside: live count shown in room</span><span>Respect the habitat</span></div>
          </div>
        ) : (
          <div className="relative grid min-h-[68vh] place-items-center overflow-hidden rounded-[2.5rem] border-[12px] border-[#20170c] bg-[radial-gradient(circle_at_center,rgba(18,78,46,.18),rgba(0,0,0,.92)_58%)] p-8 text-center shadow-[0_0_0_2px_rgba(244,180,0,.28),0_35px_90px_rgba(0,0,0,.8)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(115deg,transparent_0%,rgba(220,250,255,.08)_24%,transparent_39%,transparent_66%,rgba(255,255,255,.05)_76%,transparent_90%)]" />
            <div className="absolute left-5 top-5 rounded-lg border border-[#d8a729]/35 bg-[#171006]/90 px-4 py-2 text-left"><p className="text-[9px] font-black uppercase tracking-[.25em] text-[#d9b75f]">Exhibit status</p><p className="text-sm font-black uppercase text-white">Waiting for the crew</p></div>
            <div className="max-w-xl">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#f4b400]/40 bg-[#f4b400]/10 text-5xl shadow-[0_0_45px_rgba(244,180,0,.12)]">🦁</div>
              <h2 className="mt-6 font-display text-3xl font-black uppercase">The habitat is ready</h2>
              <p className="mt-3 leading-7 text-white/55">Sign in at the visitor gate, enter the habitat, then allow camera and microphone access. Your camera and mic begin off.</p>
              {state === "error" ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{message}{message.toLowerCase().includes("sign in") ? <a className="ml-2 font-black underline" href="/sign-in?next=/live">Sign in</a> : null}</div> : null}
              <button onClick={enterRoom} disabled={state === "opening"} className="mt-7 rounded-full bg-[#f4b400] px-7 py-3.5 font-black text-black disabled:opacity-50">{state === "opening" ? "Opening the gate…" : "Enter the Zoo Crew Habitat"}</button>
              <p className="mt-4 text-xs uppercase tracking-[.15em] text-white/35">Private exhibit · Up to 10 inside · Owners manage the habitat</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
