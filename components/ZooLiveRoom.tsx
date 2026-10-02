"use client";

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { id: string; name: string; body: string; createdAt: number };
type RoomMessage =
  | { kind: "comment"; id: string; name: string; body: string; createdAt: number }
  | { kind: "feature"; sessionId: string }
  | { kind: "self-stage"; sessionId: string }
  | { kind: "self-cage"; sessionId: string; nextSessionId: string }
  | { kind: "positions"; sessionIds: string[] };

type Backdrop = "night" | "jungle" | "gold";

const backdropClasses: Record<Backdrop, string> = {
  night: "bg-[radial-gradient(circle_at_72%_20%,rgba(235,238,207,.35),transparent_13%),linear-gradient(160deg,#071b1a,#030706_72%)]",
  jungle: "bg-[radial-gradient(circle_at_25%_30%,rgba(34,197,94,.34),transparent_24%),linear-gradient(145deg,#12351d,#041008_75%)]",
  gold: "bg-[radial-gradient(circle_at_50%_25%,rgba(244,180,0,.4),transparent_28%),linear-gradient(145deg,#402907,#090603_76%)]",
};

function MediaTile({ participant, featured = false, caged = false, outputDeviceId, onSelect, onSelfSettings }: { participant: DailyParticipant; featured?: boolean; caged?: boolean; outputDeviceId?: string; onSelect?: () => void; onSelfSettings?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = participant.tracks.video.persistentTrack;
  const audioTrack = participant.tracks.audio.persistentTrack;
  const videoOn = participant.tracks.video.state === "playable" && Boolean(videoTrack);
  const audioOn = participant.tracks.audio.state === "playable";
  const userData = participant.userData && typeof participant.userData === "object" ? participant.userData as Record<string, unknown> : {};
  const backdrop = userData.backdrop === "jungle" || userData.backdrop === "gold" ? userData.backdrop : "night";
  const roleLabel = userData.role === "owner" ? "Owner" : userData.role === "manager" ? "Manager" : userData.role === "moderator" ? "Moderator" : participant.owner ? "Moderator" : "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
    if (videoTrack) void video.play().catch(() => undefined);
  }, [videoTrack, videoOn]);

  useEffect(() => {
    if (participant.local) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = audioTrack ? new MediaStream([audioTrack]) : null;
    if (outputDeviceId && "setSinkId" in audio) {
      void (audio as HTMLAudioElement & { setSinkId: (deviceId: string) => Promise<void> }).setSinkId(outputDeviceId).catch(() => undefined);
    }
    if (audioTrack) void audio.play().catch(() => undefined);
  }, [audioTrack, outputDeviceId, participant.local]);

  return (
    <button type="button" onClick={participant.local ? onSelfSettings : onSelect} className={`group relative h-full w-full overflow-hidden bg-[#121313] text-left ${featured ? "rounded-2xl sm:rounded-3xl" : "rounded-xl sm:rounded-2xl"}`}>
      {videoOn ? <video ref={videoRef} playsInline muted={participant.local} autoPlay className={`h-full w-full object-cover ${participant.local ? "-scale-x-100" : ""}`} /> : (
        <div className={`grid h-full place-items-center ${backdropClasses[backdrop]}`}>
          <div className={`${featured ? "h-24 w-24 text-4xl sm:h-36 sm:w-36 sm:text-6xl" : "h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl"} grid place-items-center rounded-full border border-[#f4b400]/35 bg-black/55 font-black text-[#f4b400]`}>
            {(participant.user_name || "Z").slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      {!participant.local ? <audio ref={audioRef} autoPlay playsInline /> : null}
      {caged ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-y-0 left-[20%] w-[5px] bg-gradient-to-r from-[#3a2917] via-[#c89c52] to-[#392716] shadow-[2px_0_7px_rgba(0,0,0,.8)] sm:w-2" />
          <div className="absolute inset-y-0 right-[20%] w-[5px] bg-gradient-to-r from-[#3a2917] via-[#c89c52] to-[#392716] shadow-[2px_0_7px_rgba(0,0,0,.8)] sm:w-2" />
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-[#d5ac63] via-[#59401f] to-[#21170c] shadow-[0_3px_8px_rgba(0,0,0,.85)] sm:h-3" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-b from-[#d5ac63] via-[#59401f] to-[#21170c] shadow-[0_-3px_8px_rgba(0,0,0,.85)] sm:h-3" />
          <div className="absolute bottom-2.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-[#e9c477] sm:bottom-3.5 sm:right-2 sm:text-[9px]">Caged</div>
        </div>
      ) : null}
      <div className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/95 via-black/55 to-transparent ${featured ? "px-4 pb-12 pt-4 sm:px-6 sm:pb-20 sm:pt-6" : "px-2 pb-7 pt-2 sm:px-3 sm:pb-10 sm:pt-3"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {roleLabel ? <span className="mb-1 inline-flex rounded-full bg-[#f4b400] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black sm:text-[10px]">{roleLabel}</span> : null}
            <p className={`${featured ? "text-base sm:text-xl" : "text-[11px] sm:text-sm"} truncate font-black text-white`}>{participant.user_name || "Zoo Crew guest"}{participant.local ? " · You" : ""}</p>
          </div>
          <span aria-label={audioOn ? "Microphone on" : "Microphone muted"} className={`${featured ? "text-lg" : "text-xs"}`}>{audioOn ? "🎙️" : "🔇"}</span>
        </div>
      </div>
      {featured ? <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 sm:rounded-3xl" /> : null}
    </button>
  );
}

export default function ZooLiveRoom({ roomUrl, isOwner, canModerate, staffRole }: { roomUrl: string; isOwner: boolean; canModerate: boolean; staffRole: string | null }) {
  const callRef = useRef<DailyCall | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const microphoneTrackRef = useRef<MediaStreamTrack | null>(null);
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [featuredId, setFeaturedId] = useState("");
  const [slotOrder, setSlotOrder] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("Opening the habitat…");
  const [audioOn, setAudioOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [backdrop, setBackdrop] = useState<Backdrop>("night");
  const [moderationTargetId, setModerationTargetId] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [inputDeviceId, setInputDeviceId] = useState("");
  const [outputDeviceId, setOutputDeviceId] = useState("");

  const refresh = () => {
    const call = callRef.current;
    if (!call) return;
    const next = call.participants();
    setParticipants({ ...next });
    const local = next.local;
    setAudioOn(local?.tracks.audio.state === "playable");
    setVideoOn(local?.tracks.video.state === "playable");
    setFeaturedId((current) => current && Object.values(next).some((person) => person.session_id === current) ? current : (Object.values(next).find((person) => !person.local)?.session_id || local?.session_id || ""));
    setSlotOrder((current) => {
      const available = Object.values(next).map((person) => person.session_id);
      return [...current.filter((id) => available.includes(id)), ...available.filter((id) => !current.includes(id))];
    });
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
      call.on("app-message", (event) => {
        const data = event.data as RoomMessage;
        const sender = Object.values(call?.participants() || {}).find((person) => person.session_id === event.fromId);
        if (data?.kind === "comment" && typeof data.body === "string") {
          setMessages((current) => [...current.slice(-39), { id: data.id, name: data.name || sender?.user_name || "Guest", body: data.body.slice(0, 180), createdAt: data.createdAt }]);
        }
        if (data?.kind === "feature" && sender?.owner && typeof data.sessionId === "string") setFeaturedId(data.sessionId);
        if (data?.kind === "self-stage" && sender?.session_id === data.sessionId) setFeaturedId(data.sessionId);
        if (data?.kind === "self-cage" && sender?.session_id === data.sessionId && typeof data.nextSessionId === "string" && Object.values(call?.participants() || {}).some((person) => person.session_id === data.nextSessionId && person.session_id !== sender.session_id)) setFeaturedId(data.nextSessionId);
        if (data?.kind === "positions" && sender?.owner && Array.isArray(data.sessionIds)) setSlotOrder(data.sessionIds.filter((id) => typeof id === "string"));
      });
      call.on("error", () => setStatus("The habitat connection was interrupted."));
      await call.join({ url: parsed.toString(), token, startVideoOff: true, startAudioOff: true });
      if (active) {
        refresh();
        await call.setUserData({ role: staffRole, backdrop });
        setStatus("Live inside the Zoo Crew habitat");
      }
    }
    void connect().catch(() => setStatus("The habitat could not open. Refresh and try again."));
    return () => {
      active = false;
      if (call) {
        void call.leave().catch(() => undefined).finally(() => call?.destroy());
      }
      cameraTrackRef.current?.stop();
      microphoneTrackRef.current?.stop();
      callRef.current = null;
    };
  }, [roomUrl, staffRole]);

  const people = useMemo(() => {
    const list = Object.values(participants);
    return [...list].sort((a, b) => {
      const aIndex = slotOrder.indexOf(a.session_id);
      const bIndex = slotOrder.indexOf(b.session_id);
      return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
    });
  }, [participants, slotOrder]);
  const featured = people.find((person) => person.session_id === featuredId) || people[0];
  const rail = people.filter((person) => person.session_id !== featured?.session_id);
  const moderationTarget = people.find((person) => person.session_id === moderationTargetId);

  function feature(person: DailyParticipant) {
    if (!canModerate) return;
    setFeaturedId(person.session_id);
    callRef.current?.sendAppMessage({ kind: "feature", sessionId: person.session_id } satisfies RoomMessage, "*");
    setModerationTargetId("");
  }

  function moveSelfToStage() {
    const local = callRef.current?.participants().local;
    if (!local) return;
    setFeaturedId(local.session_id);
    callRef.current?.sendAppMessage({ kind: "self-stage", sessionId: local.session_id } satisfies RoomMessage, "*");
    setControlsOpen(false);
    setStatus("You moved to the main stage");
  }

  function moveSelfToCage() {
    const current = Object.values(callRef.current?.participants() || {});
    const local = current.find((person) => person.local);
    const next = current.find((person) => !person.local);
    if (!local || !next) {
      setStatus("Someone else must be inside before you can move to a cage.");
      return;
    }
    setFeaturedId(next.session_id);
    callRef.current?.sendAppMessage({ kind: "self-cage", sessionId: local.session_id, nextSessionId: next.session_id } satisfies RoomMessage, "*");
    setControlsOpen(false);
    setStatus("Your box was moved to a cage");
  }

  function openParticipantControls(person: DailyParticipant) {
    if (person.local) setControlsOpen(true);
    else if (canModerate) setModerationTargetId(person.session_id);
  }

  function moveParticipant(direction: -1 | 1) {
    const currentIndex = slotOrder.indexOf(moderationTargetId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= slotOrder.length) return;
    const next = [...slotOrder];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    setSlotOrder(next);
    callRef.current?.sendAppMessage({ kind: "positions", sessionIds: next } satisfies RoomMessage, "*");
  }

  function moderateParticipant(kind: "audio" | "video") {
    if (!canModerate || !moderationTargetId) return;
    callRef.current?.updateParticipant(moderationTargetId, kind === "audio" ? { setAudio: false } : { setVideo: false });
    setStatus(kind === "audio" ? "Participant microphone muted" : "Participant camera turned off");
  }

  async function acquireCamera(targetFacing = facingMode) {
    const call = callRef.current;
    if (!call) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: targetFacing }, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error("No camera was found.");
    const previous = cameraTrackRef.current;
    cameraTrackRef.current = track;
    await call.updateInputSettings({ video: { settings: { customTrack: track } } });
    call.setLocalVideo(true);
    previous?.stop();
    setVideoOn(true);
  }

  async function acquireMicrophone(deviceId = inputDeviceId) {
    const call = callRef.current;
    if (!call) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
    });
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error("No microphone was found.");
    const previous = microphoneTrackRef.current;
    microphoneTrackRef.current = track;
    await call.updateInputSettings({ audio: { settings: { customTrack: track } } });
    call.setLocalAudio(true);
    previous?.stop();
    setAudioOn(true);
  }

  async function toggleAudio() {
    const next = !audioOn;
    const call = callRef.current;
    if (!call) return;
    try {
      const track = call.participants().local?.tracks.audio.persistentTrack;
      if (next && (!track || track.readyState === "ended")) await acquireMicrophone();
      else {
        call.setLocalAudio(next);
        setAudioOn(next);
      }
    } catch {
      setStatus("Microphone blocked. Allow microphone access in your browser settings.");
    }
  }

  async function toggleVideo() {
    const next = !videoOn;
    const call = callRef.current;
    if (!call) return;
    try {
      const track = call.participants().local?.tracks.video.persistentTrack;
      if (next && (!track || track.readyState === "ended")) await acquireCamera();
      else {
        call.setLocalVideo(next);
        setVideoOn(next);
      }
    } catch {
      setStatus("Camera blocked. Allow camera access in your browser settings.");
    }
  }

  async function openAudioSettings() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((device) => device.kind === "audioinput"));
      setAudioOutputs(devices.filter((device) => device.kind === "audiooutput"));
      setAudioSettingsOpen(true);
    } catch {
      setStatus("Audio devices could not be loaded. Check browser permissions.");
    }
  }

  async function chooseMicrophone(deviceId: string) {
    setInputDeviceId(deviceId);
    try {
      await acquireMicrophone(deviceId);
      setStatus("Bluetooth microphone selected");
    } catch {
      setStatus("That microphone could not connect. Reconnect Bluetooth and try again.");
    }
  }

  async function chooseSpeaker(deviceId: string) {
    setOutputDeviceId(deviceId);
    try {
      await callRef.current?.setOutputDeviceAsync({ outputDeviceId: deviceId });
      const players = Array.from(document.querySelectorAll<HTMLAudioElement>("audio"));
      await Promise.all(players.map((player) => "setSinkId" in player
        ? (player as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
        : Promise.resolve()));
      setStatus("Bluetooth speaker selected");
    } catch {
      setStatus("Android blocked speaker switching. Select Bluetooth in the phone media-output panel.");
    }
  }

  async function flipCamera() {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    if (!videoOn) return;
    try {
      await acquireCamera(nextFacing);
    } catch {
      setStatus("Could not switch cameras on this device.");
    }
  }

  async function chooseBackdrop(next: Backdrop) {
    setBackdrop(next);
    const current = participants.local?.userData && typeof participants.local.userData === "object" ? participants.local.userData as Record<string, unknown> : {};
    await callRef.current?.setUserData({ ...current, backdrop: next });
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black shadow-[0_28px_90px_rgba(0,0,0,.75)]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#090b0a] px-3 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /><p className="truncate text-xs font-black uppercase tracking-[.16em] text-[#f4b400]">Zoo Crew Vibe · Live</p></div>
          <p className="mt-1 truncate text-[11px] text-white/45">{status}</p>
        </div>
        <div className="flex items-center gap-2"><button onClick={() => setMembersOpen(true)} aria-label="View members" className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70">👥 {people.length}</button><button onClick={leave} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg font-bold text-white">×</button></div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_88px] gap-1 bg-black p-1 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-2 sm:p-2 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative min-w-0 overflow-hidden rounded-2xl bg-[#0c100e] sm:rounded-3xl">
          {featured ? <MediaTile participant={featured} featured outputDeviceId={outputDeviceId} onSelect={() => openParticipantControls(featured)} onSelfSettings={() => setControlsOpen(true)} /> : <div className="grid h-full place-items-center text-center text-white/45"><div><p className="text-5xl">🦁</p><p className="mt-4 font-black uppercase">Waiting for the crew</p></div></div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 mx-3 max-w-[90%] sm:bottom-5 sm:mx-5 sm:max-w-xl">
            <div className="grid gap-1.5">
              {messages.slice(-4).map((item) => <div key={item.id} className="w-fit max-w-full rounded-2xl bg-black/65 px-3 py-2 text-xs leading-5 text-white shadow-lg backdrop-blur-sm sm:text-sm"><strong className="mr-2 text-[#f4b400]">{item.name}</strong><span className="break-words">{item.body}</span></div>)}
            </div>
          </div>
        </div>

        <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-1 sm:gap-2">
          <div className="grid min-h-0 auto-rows-[106px] gap-1 overflow-y-auto sm:auto-rows-[150px] sm:gap-2">
            {rail.map((person) => <MediaTile key={person.session_id} participant={person} caged outputDeviceId={outputDeviceId} onSelect={() => openParticipantControls(person)} onSelfSettings={() => setControlsOpen(true)} />)}
            {Array.from({ length: Math.max(0, 4 - rail.length) }).map((_, index) => <div key={index} className="relative grid place-items-center overflow-hidden rounded-xl border border-[#8b6835]/35 bg-[linear-gradient(145deg,#11130f,#080908)] text-center text-[10px] font-bold uppercase text-white/25 sm:rounded-2xl sm:text-xs"><span className="relative z-10">Open<br />cage</span><div aria-hidden="true" className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-1/4 w-1.5 bg-gradient-to-r from-[#3a2917] via-[#b48948] to-[#30200f]" /><div className="absolute inset-y-0 right-1/4 w-1.5 bg-gradient-to-r from-[#3a2917] via-[#b48948] to-[#30200f]" /></div></div>)}
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
          <button type="button" onClick={openAudioSettings} aria-label="Audio and Bluetooth settings" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-lg text-white">🎧</button>
        </form>
      </div>

      {membersOpen ? <div className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center" onClick={() => setMembersOpen(false)}>
        <div className="max-h-[75vh] w-full overflow-y-auto rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">Inside the habitat</p><h2 className="mt-1 text-xl font-black text-white">View Members · {people.length}</h2></div><button onClick={() => setMembersOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
          <div className="mt-4 grid gap-2">{people.map((person) => <div key={person.session_id} className="flex items-center justify-between rounded-2xl bg-white/[.06] px-4 py-3"><div><p className="font-black text-white">{person.user_name || "Zoo Crew guest"}{person.local ? " · You" : ""}</p><p className="text-xs text-white/45">{person.tracks.audio.state === "playable" ? "Mic on" : "Muted"} · {person.tracks.video.state === "playable" ? "Camera on" : "Camera off"}</p></div><span>{person.tracks.audio.state === "playable" ? "🎙️" : "🔇"}</span></div>)}</div>
        </div>
      </div> : null}

      {audioSettingsOpen ? <div className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center" onClick={() => setAudioSettingsOpen(false)}>
        <div className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">Android & Bluetooth</p><h2 className="mt-1 text-xl font-black text-white">Audio Devices</h2></div><button onClick={() => setAudioSettingsOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/55">Microphone</label>
          <select value={inputDeviceId} onChange={(event) => void chooseMicrophone(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b18] p-3 text-white"><option value="">Phone default</option>{audioInputs.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select>
          <label className="mt-4 block text-xs font-black uppercase tracking-wider text-white/55">Speaker / headphones</label>
          <select value={outputDeviceId} onChange={(event) => void chooseSpeaker(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b18] p-3 text-white"><option value="">Phone default</option>{audioOutputs.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Audio output ${index + 1}`}</option>)}</select>
          <p className="mt-4 text-[11px] leading-5 text-white/45">Connect Bluetooth before entering the Live House. If Android does not list the speaker here, use the phone’s Media output panel, select the Bluetooth device, then tap “Tap for sound” again.</p>
        </div>
      </div> : null}

      {controlsOpen ? <div className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center" onClick={() => setControlsOpen(false)}>
        <div className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">Your animal controls</p><h2 className="mt-1 text-xl font-black text-white">Camera, mic & box scene</h2></div><button onClick={() => setControlsOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button onClick={toggleVideo} className={`rounded-2xl px-2 py-4 text-sm font-black ${videoOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}><span className="block text-2xl">📹</span>{videoOn ? "Camera on" : "Camera off"}</button>
            <button onClick={toggleAudio} className={`rounded-2xl px-2 py-4 text-sm font-black ${audioOn ? "bg-emerald-500 text-white" : "bg-white/10 text-white"}`}><span className="block text-2xl">🎙️</span>{audioOn ? "Mic on" : "Mic off"}</button>
            <button onClick={flipCamera} className="rounded-2xl bg-white/10 px-2 py-4 text-sm font-black text-white"><span className="block text-2xl">🔄</span>Flip camera</button>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-white/50">Your box position</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={moveSelfToStage} className="rounded-2xl bg-[#f4b400] px-3 py-4 text-sm font-black text-black">⬆️ Move Me to Main Stage</button>
            <button onClick={moveSelfToCage} className="rounded-2xl border border-[#f4b400]/25 bg-white/10 px-3 py-4 text-sm font-black text-white">⬇️ Shrink Me to Cage</button>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-white/50">Choose your box background</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["night", "jungle", "gold"] as Backdrop[]).map((scene) => <button key={scene} onClick={() => void chooseBackdrop(scene)} className={`h-20 rounded-2xl border ${backdropClasses[scene]} text-xs font-black uppercase text-white ${backdrop === scene ? "border-[#f4b400] ring-2 ring-[#f4b400]/40" : "border-white/10"}`}>{scene === "night" ? "Night Zoo" : scene === "jungle" ? "Jungle" : "Gold Den"}</button>)}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-white/45">Box backgrounds appear when your camera is off. True person-cutout virtual backgrounds are not supported reliably on iPhone browsers yet.</p>
        </div>
      </div> : null}

      {canModerate && moderationTarget ? <div className="absolute inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:place-items-center" onClick={() => setModerationTargetId("")}>
        <div className="w-full rounded-t-[2rem] border border-[#f4b400]/25 bg-[#0c100e] p-5 shadow-2xl sm:max-w-md sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">Host & moderator controls</p><h2 className="mt-1 text-xl font-black text-white">{moderationTarget.user_name || "Participant"}</h2></div><button onClick={() => setModerationTargetId("")} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
          <button onClick={() => feature(moderationTarget)} className="mt-5 w-full rounded-2xl bg-[#f4b400] px-4 py-4 font-black text-black">🔄 Swap Position — Put on Main Stage</button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => moveParticipant(-1)} className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white">↑ Move Box Up</button>
            <button onClick={() => moveParticipant(1)} className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white">↓ Move Box Down</button>
            <button onClick={() => moderateParticipant("audio")} className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-4 text-sm font-black text-red-200">🔇 Mute Their Mic</button>
            <button onClick={() => moderateParticipant("video")} className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-4 text-sm font-black text-red-200">🚫 Turn Camera Off</button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-white/45">Only approved Zoo Crew owners, managers, and moderators receive these controls. Participants can turn their own devices back on afterward.</p>
        </div>
      </div> : null}
    </div>
  );
}
