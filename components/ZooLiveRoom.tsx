"use client";

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { id: string; name: string; body: string; createdAt: number };
type RoomMessage =
  | { kind: "comment"; id: string; name: string; body: string; createdAt: number }
  | { kind: "feature"; sessionId: string };

function MediaTile({ participant, featured = false, onSelect }: { participant: DailyParticipant; featured?: boolean; onSelect?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = participant.tracks.video.persistentTrack;
  const audioTrack = participant.tracks.audio.persistentTrack;
  const videoOn = participant.tracks.video.state === "playable" && Boolean(videoTrack);
  const audioOn = participant.tracks.audio.state === "playable";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
    if (videoTrack) void video.play().catch(() => undefined);
  }, [videoTrack]);

  useEffect(() => {
    if (participant.local) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = audioTrack ? new MediaStream([audioTrack]) : null;
    if (audioTrack) void audio.play().catch(() => undefined);
  }, [audioTrack, participant.local]);

  return (
    <button type="button" onClick={onSelect} className={`group relative h-full w-full overflow-hidden bg-[#121313] text-left ${featured ? "rounded-2xl sm:rounded-3xl" : "rounded-xl sm:rounded-2xl"}`}>
      {videoOn ? <video ref={videoRef} playsInline muted={participant.local} autoPlay className={`h-full w-full object-cover ${participant.local ? "-scale-x-100" : ""}`} /> : (
        <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(244,180,0,.16),transparent_34%),linear-gradient(145deg,#112018,#090b0a)]">
          <div className={`${featured ? "h-24 w-24 text-4xl sm:h-36 sm:w-36 sm:text-6xl" : "h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl"} grid place-items-center rounded-full border border-[#f4b400]/35 bg-black/55 font-black text-[#f4b400]`}>
            {(participant.user_name || "Z").slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      {!participant.local ? <audio ref={audioRef} autoPlay /> : null}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent ${featured ? "px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-20" : "px-2 pb-2 pt-7 sm:px-3 sm:pb-3"}`}>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {participant.owner ? <span className="mb-1 inline-flex rounded-full bg-[#f4b400] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black sm:text-[10px]">Owner</span> : null}
            <p className={`${featured ? "text-base sm:text-xl" : "text-[11px] sm:text-sm"} truncate font-black text-white`}>{participant.user_name || "Zoo Crew guest"}{participant.local ? " · You" : ""}</p>
          </div>
          <span aria-label={audioOn ? "Microphone on" : "Microphone muted"} className={`${featured ? "text-lg" : "text-xs"}`}>{audioOn ? "🎙️" : "🔇"}</span>
        </div>
      </div>
      {featured ? <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 sm:rounded-3xl" /> : null}
    </button>
  );
}

export default function ZooLiveRoom({ roomUrl, isOwner }: { roomUrl: string; isOwner: boolean }) {
  const callRef = useRef<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [featuredId, setFeaturedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("Opening the habitat…");
  const [audioOn, setAudioOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    const call = callRef.current;
    if (!call) return;
    const next = call.participants();
    setParticipants({ ...next });
    const local = next.local;
    setAudioOn(local?.tracks.audio.state === "playable");
    setVideoOn(local?.tracks.video.state === "playable");
    setFeaturedId((current) => current && Object.values(next).some((person) => person.session_id === current) ? current : (Object.values(next).find((person) => !person.local)?.session_id || local?.session_id || ""));
  };

  useEffect(() => {
    let active = true;
    let call: DailyCall | null = null;
    async function connect() {
      const Daily = (await import("@daily-co/daily-js")).default;
      if (!active) return;
      const parsed = new URL(roomUrl);
      const token = parsed.searchParams.get("t") || undefined;
      parsed.searchParams.delete("t");
      call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
      callRef.current = call;
      const update = () => refresh();
      call.on("joined-meeting", update);
      call.on("participant-joined", update);
      call.on("participant-updated", update);
      call.on("participant-left", update);
      call.on("track-started", update);
      call.on("track-stopped", update);
      call.on("active-speaker-change", (event) => {
        if (!isOwner && event.activeSpeaker.peerId) setFeaturedId(event.activeSpeaker.peerId);
      });
      call.on("app-message", (event) => {
        const data = event.data as RoomMessage;
        const sender = Object.values(call?.participants() || {}).find((person) => person.session_id === event.fromId);
        if (data?.kind === "comment" && typeof data.body === "string") {
          setMessages((current) => [...current.slice(-39), { id: data.id, name: data.name || sender?.user_name || "Guest", body: data.body.slice(0, 180), createdAt: data.createdAt }]);
        }
        if (data?.kind === "feature" && sender?.owner && typeof data.sessionId === "string") setFeaturedId(data.sessionId);
      });
      call.on("error", () => setStatus("The habitat connection was interrupted."));
      await call.join({ url: parsed.toString(), token, startVideoOff: true, startAudioOff: true });
      if (active) {
        refresh();
        setStatus("Live inside the Zoo Crew habitat");
      }
    }
    void connect().catch(() => setStatus("The habitat could not open. Refresh and try again."));
    return () => {
      active = false;
      if (call) {
        void call.leave().catch(() => undefined).finally(() => call?.destroy());
      }
      callRef.current = null;
    };
  }, [roomUrl, isOwner]);

  const people = useMemo(() => Object.values(participants).sort((a, b) => Number(b.owner) - Number(a.owner) || Number(b.local) - Number(a.local)), [participants]);
  const featured = people.find((person) => person.session_id === featuredId) || people[0];
  const rail = people.filter((person) => person.session_id !== featured?.session_id);

  function feature(person: DailyParticipant) {
    setFeaturedId(person.session_id);
    if (isOwner) callRef.current?.sendAppMessage({ kind: "feature", sessionId: person.session_id } satisfies RoomMessage, "*");
  }

  async function toggleAudio() {
    const next = !audioOn;
    callRef.current?.setLocalAudio(next);
    setAudioOn(next);
  }

  async function toggleVideo() {
    const next = !videoOn;
    callRef.current?.setLocalVideo(next);
    setVideoOn(next);
  }

  function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("comment") || "").trim().slice(0, 180);
    const local = participants.local;
    if (!body || !local) return;
    const comment: ChatMessage = { id: crypto.randomUUID(), name: local.user_name || "Guest", body, createdAt: Date.now() };
    setMessages((current) => [...current.slice(-39), comment]);
    callRef.current?.sendAppMessage({ kind: "comment", ...comment } satisfies RoomMessage, "*");
    form.reset();
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/live`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function leave() {
    await callRef.current?.leave();
    window.location.assign("/");
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#f4b400]/30 bg-black shadow-[0_28px_90px_rgba(0,0,0,.75)] sm:rounded-[2.2rem]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#090b0a] px-3 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /><p className="truncate text-xs font-black uppercase tracking-[.16em] text-[#f4b400]">Zoo Crew Vibe · Live</p></div>
          <p className="mt-1 truncate text-[11px] text-white/45">{status}</p>
        </div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70">👥 {people.length}</span><button onClick={leave} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg font-bold text-white">×</button></div>
      </header>

      <div className="grid h-[68dvh] min-h-[520px] grid-cols-[minmax(0,1fr)_88px] gap-1 bg-black p-1 sm:h-[76vh] sm:min-h-[650px] sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-2 sm:p-2 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative min-w-0 overflow-hidden rounded-2xl bg-[#0c100e] sm:rounded-3xl">
          {featured ? <MediaTile participant={featured} featured onSelect={() => feature(featured)} /> : <div className="grid h-full place-items-center text-center text-white/45"><div><p className="text-5xl">🦁</p><p className="mt-4 font-black uppercase">Waiting for the crew</p></div></div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 mx-3 max-w-[90%] sm:bottom-5 sm:mx-5 sm:max-w-xl">
            <div className="grid gap-1.5">
              {messages.slice(-4).map((item) => <div key={item.id} className="w-fit max-w-full rounded-2xl bg-black/65 px-3 py-2 text-xs leading-5 text-white shadow-lg backdrop-blur-sm sm:text-sm"><strong className="mr-2 text-[#f4b400]">{item.name}</strong><span className="break-words">{item.body}</span></div>)}
            </div>
          </div>
        </div>

        <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-1 sm:gap-2">
          <div className="grid min-h-0 auto-rows-[106px] gap-1 overflow-y-auto sm:auto-rows-[150px] sm:gap-2">
            {rail.map((person) => <MediaTile key={person.session_id} participant={person} onSelect={() => feature(person)} />)}
            {Array.from({ length: Math.max(0, 4 - rail.length) }).map((_, index) => <div key={index} className="grid place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.035] text-center text-[10px] font-bold uppercase text-white/25 sm:rounded-2xl sm:text-xs">Open<br />box</div>)}
          </div>
          <button onClick={copyInvite} className="grid min-h-20 place-items-center rounded-xl border border-[#f4b400]/25 bg-[#f4b400]/10 px-1 text-center text-[10px] font-black uppercase text-[#f4b400] sm:min-h-24 sm:rounded-2xl sm:text-xs"><span><span className="block text-2xl">＋</span>{copied ? "Link copied" : "Invite"}</span></button>
        </aside>
      </div>

      <div className="border-t border-white/10 bg-[#090b0a] p-2 sm:p-3">
        <form onSubmit={sendComment} className="flex items-center gap-2">
          <input name="comment" maxLength={180} placeholder="Say something to the Zoo Crew…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.06] px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-[#f4b400]/55" />
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4b400] font-black text-black">➤</button>
          <button type="button" onClick={toggleVideo} aria-label={videoOn ? "Turn camera off" : "Turn camera on"} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${videoOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}>📹</button>
          <button type="button" onClick={toggleAudio} aria-label={audioOn ? "Mute microphone" : "Unmute microphone"} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${audioOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}>🎙️</button>
        </form>
      </div>
    </div>
  );
}
