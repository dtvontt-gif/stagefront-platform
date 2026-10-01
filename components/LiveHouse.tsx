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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(244,180,0,.15),transparent_28%),radial-gradient(circle_at_88%_20%,rgba(124,58,237,.16),transparent_25%)]" />
      <div className="relative mx-auto max-w-[1700px]">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap gap-3"><span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase ${state === "ready" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-[#f4b400]/30 bg-[#f4b400]/10 text-[#f4b400]"}`}>{state === "ready" ? "Room connected" : "Private beta"}</span><span className="pill">Powered by Daily</span></div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase sm:text-6xl">Zoo Crew Live House</h1>
            <p className="mt-3 max-w-3xl text-white/60">The Zoo Crew family room for hosts, approved guests, and signed-in StageFront members.</p>
          </div>
          {state !== "ready" ? <button onClick={enterRoom} disabled={state === "opening"} className="primary-cta disabled:opacity-50">{state === "opening" ? "Opening the room…" : "Enter live room"}</button> : <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white/60">{owner ? "Owner controls enabled" : "Member access"}</span>}
        </header>

        {state === "ready" ? (
          <div className="overflow-hidden rounded-[2rem] border border-[#f4b400]/30 bg-black shadow-2xl">
            <iframe title="Zoo Crew Live House" src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[78vh] min-h-[620px] w-full border-0" />
          </div>
        ) : (
          <div className="grid min-h-[68vh] place-items-center rounded-[2rem] border border-[#f4b400]/25 bg-black/45 p-8 text-center shadow-2xl">
            <div className="max-w-xl">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#f4b400]/40 bg-[#f4b400]/10 text-5xl">🎙️</div>
              <h2 className="mt-6 font-display text-3xl font-black uppercase">The room is ready for the crew</h2>
              <p className="mt-3 leading-7 text-white/55">Sign in, enter the room, then allow camera and microphone access. Your camera and mic begin off so you control when you appear.</p>
              {state === "error" ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{message}{message.toLowerCase().includes("sign in") ? <a className="ml-2 font-black underline" href="/sign-in?next=/live">Sign in</a> : null}</div> : null}
              <button onClick={enterRoom} disabled={state === "opening"} className="mt-7 rounded-full bg-[#f4b400] px-7 py-3.5 font-black text-black disabled:opacity-50">{state === "opening" ? "Opening…" : "Enter Zoo Crew Live"}</button>
              <p className="mt-4 text-xs text-white/35">Private beta · Up to 10 people · Owners control removal and room settings</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
