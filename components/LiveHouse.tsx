"use client";

import { useEffect, useState } from "react";
import ZooLiveRoom from "@/components/ZooLiveRoom";
import InstallZooCrewApp from "@/components/InstallZooCrewApp";

type RoomState = "checking" | "offline" | "live" | "opening" | "ready" | "error";

export default function LiveHouse({ buildVersion }: { buildVersion: string }) {
  const [state, setState] = useState<RoomState>("checking");
  const [roomUrl, setRoomUrl] = useState("");
  const [message, setMessage] = useState("");
  const [owner, setOwner] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [canControlLive, setCanControlLive] = useState(false);
  const [canEndLive, setCanEndLive] = useState(false);
  const [liveStarterUserId, setLiveStarterUserId] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<"viewer" | "stage">("viewer");
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkVersion() {
      const response = await fetch(`/api/live/version?t=${Date.now()}`, { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as { version?: string };
      if (!active || !response.ok || !result.version || result.version === buildVersion) return;
      if (state === "ready") setUpdateAvailable(true);
      else window.location.reload();
    }
    const timer = window.setInterval(() => void checkVersion(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [buildVersion, state]);

  useEffect(() => {
    if (state === "ready" || state === "opening") return;
    let active = true;
    async function checkStatus() {
      const response = await fetch("/api/live/room", { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as { isLive?: boolean; canControlLive?: boolean; canEndLive?: boolean; role?: string | null; message?: string };
      if (!active) return;
      if (!response.ok) {
        setState("error");
        setMessage(result.message || "The Live House status could not be checked.");
        return;
      }
      setCanControlLive(Boolean(result.canControlLive));
      setCanEndLive(Boolean(result.canEndLive));
      setStaffRole(result.role || null);
      setMessage("");
      setState(result.isLive ? "live" : "offline");
    }
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "ready") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [state]);

  async function enterRoom(requestedMode: "viewer" | "stage" = "viewer") {
    setState("opening");
    setMessage("");
    if (requestedMode === "stage") try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone access are not supported in this browser. Open StageFront directly in Safari or Chrome.");
      }
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      permissionStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const permissionMessage = error instanceof Error && error.message.includes("not supported")
        ? error.message
        : "Camera or microphone access was blocked. On iPhone, open Settings → Safari → Camera and Microphone, choose Ask or Allow, then return and try again.";
      setState("error");
      setMessage(permissionMessage);
      return;
    }
    const response = await fetch("/api/live/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enter", mode: requestedMode }) });
    const result = (await response.json().catch(() => ({}))) as { roomUrl?: string; message?: string; isOwner?: boolean; canModerate?: boolean; canControlLive?: boolean; canEndLive?: boolean; entryMode?: "viewer" | "stage"; role?: string | null; username?: string | null; profileImageUrl?: string | null; liveStarterUserId?: string | null };
    if (!response.ok || !result.roomUrl) {
      setState("error");
      setMessage(result.message || "The Live House could not open.");
      return;
    }
    setRoomUrl(result.roomUrl);
    setOwner(Boolean(result.isOwner));
    setCanModerate(Boolean(result.canModerate));
    setCanControlLive(Boolean(result.canControlLive));
    setCanEndLive(Boolean(result.canEndLive));
    setLiveStarterUserId(result.liveStarterUserId || null);
    setStaffRole(result.role || null);
    setProfileImageUrl(result.profileImageUrl || null);
    setProfileUsername(result.username || null);
    setEntryMode(result.entryMode || "viewer");
    setState("ready");
  }

  async function startLive() {
    setState("opening");
    setMessage("");
    const response = await fetch("/api/live/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setState("error");
      setMessage(result.message || "The live could not be started.");
      return;
    }
    setState("live");
    await enterRoom("stage");
  }

  async function endLive() {
    const response = await fetch("/api/live/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }) });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) throw new Error(result.message || "The live could not be ended.");
    setRoomUrl("");
    setState("offline");
  }

  if (state === "ready") {
    return (
      <section className="fixed inset-0 z-[100] h-dvh overflow-hidden bg-black">
        <ZooLiveRoom roomUrl={roomUrl} isOwner={owner} canModerate={canModerate} canEndLive={canEndLive} liveStarterUserId={liveStarterUserId} initialMode={entryMode} staffRole={staffRole} profileImageUrl={profileImageUrl} profileUsername={profileUsername} onEndLive={endLive} />
        {updateAvailable ? <div className="fixed inset-x-3 top-3 z-[250] mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-[#f4b400]/50 bg-black/95 p-3 text-sm shadow-2xl"><span>A newer Live House version is ready.</span><button type="button" onClick={() => window.location.reload()} className="rounded-full bg-[#f4b400] px-4 py-2 text-xs font-black text-black">Reload now</button></div> : null}
      </section>
    );
  }

  return (
    <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-3 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[#050705]" />
      <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_16%_15%,rgba(34,197,94,.13),transparent_27%),radial-gradient(circle_at_82%_13%,rgba(244,180,0,.16),transparent_28%),linear-gradient(180deg,#07110b_0%,#050505_48%,#0c0904_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] opacity-55 [background-image:radial-gradient(circle_at_8%_12%,rgba(255,255,255,.75)_0_1px,transparent_2px),radial-gradient(circle_at_22%_25%,rgba(255,255,255,.5)_0_1px,transparent_2px),radial-gradient(circle_at_48%_10%,rgba(255,255,255,.7)_0_1px,transparent_2px),radial-gradient(circle_at_67%_22%,rgba(255,255,255,.6)_0_1px,transparent_2px),radial-gradient(circle_at_92%_9%,rgba(255,255,255,.8)_0_1px,transparent_2px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-25 [background-image:repeating-linear-gradient(112deg,transparent_0_38px,rgba(97,69,39,.8)_40px_44px,transparent_46px_95px)]" />
      <div className="relative mx-auto max-w-[1700px]">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap gap-3"><span className="rounded-full border border-[#f4b400]/30 bg-[#f4b400]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-[#f4b400]">After-hours private beta</span><span className="rounded-full border border-emerald-500/25 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-emerald-200">Visitor viewing gallery</span></div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase sm:text-6xl">Zoo Crew Live House</h1>
            <p className="mt-3 max-w-3xl text-white/60">Step up to the glass and enter the official nighttime habitat of the Zoo Crew family.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><InstallZooCrewApp />{state === "live" ? <button onClick={() => enterRoom(canModerate ? "stage" : "viewer")} className="primary-cta">{canModerate ? "Enter host stage" : "Watch live"}</button> : canControlLive ? <button onClick={startLive} disabled={state === "opening" || state === "checking"} className="primary-cta disabled:opacity-50">{state === "opening" ? "Starting live…" : "Start Live"}</button> : null}</div>
        </header>

        <div className="relative grid min-h-[72vh] place-items-center overflow-hidden rounded-[2.5rem] border-[12px] border-[#20170c] bg-[#020706] p-8 text-center shadow-[0_0_0_2px_rgba(244,180,0,.28),0_35px_90px_rgba(0,0,0,.8)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(233,242,210,.18),transparent_9%),linear-gradient(180deg,#071b1a_0%,#082219_39%,#06130c_70%,#020503_100%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-[12%] top-[8%] h-20 w-20 rounded-full bg-[#e8e5c8] opacity-80 shadow-[0_0_45px_rgba(226,236,199,.35)] sm:h-28 sm:w-28" />

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[30%] h-[42%] opacity-90">
              <div className="absolute -left-8 bottom-0 h-64 w-20 rotate-6 rounded-[55%_45%_18%_22%] bg-[#061108]" />
              <div className="absolute -left-20 bottom-36 h-40 w-72 rounded-[50%] bg-[#07170c] shadow-[120px_-24px_0_18px_#081b0e,250px_22px_0_2px_#06150b]" />
              <div className="absolute -right-8 bottom-0 h-72 w-24 -rotate-6 rounded-[45%_55%_20%_18%] bg-[#061108]" />
              <div className="absolute -right-24 bottom-40 h-44 w-80 rounded-[50%] bg-[#07170c] shadow-[-145px_-18px_0_15px_#081b0e,-300px_28px_0_0_#06150b]" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(175deg,transparent_0_18%,#07130b_19%_42%,#041008_43%)]" />
            </div>

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[31%] bg-[radial-gradient(ellipse_at_8%_100%,#25311e_0_22%,transparent_23%),radial-gradient(ellipse_at_25%_110%,#18261a_0_26%,transparent_27%),radial-gradient(ellipse_at_78%_110%,#202c1b_0_28%,transparent_29%),radial-gradient(ellipse_at_98%_100%,#2b3320_0_24%,transparent_25%),linear-gradient(180deg,#08130b_0%,#030703_100%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-[12%] left-[7%] h-20 w-52 -rotate-3 rounded-[60%_45%_35%_30%] bg-[#292b22] shadow-[inset_0_8px_16px_rgba(255,255,255,.05),70vw_20px_0_-8px_#23261e]" />

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 border-t-4 border-[#5a3a18] bg-[repeating-linear-gradient(90deg,transparent_0_9%,#4b3017_9.4%_10.1%)] opacity-80 shadow-[0_-4px_18px_rgba(0,0,0,.8)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 opacity-45 [background-image:linear-gradient(115deg,transparent_0%,rgba(220,250,255,.09)_24%,transparent_39%,transparent_66%,rgba(255,255,255,.06)_76%,transparent_90%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 z-30 w-px bg-cyan-100/10" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-1/3 z-30 w-px bg-cyan-100/10" />

            <div className="absolute left-5 top-5 z-40 rounded-lg border border-[#d8a729]/35 bg-[#171006]/90 px-4 py-2 text-left"><p className="text-[9px] font-black uppercase tracking-[.25em] text-[#d9b75f]">Exhibit status</p><p className="text-sm font-black uppercase text-white">{state === "live" ? "Live now" : state === "checking" ? "Checking status" : "Live is offline"}</p></div>
            <div className="relative z-40 max-w-xl rounded-[2rem] border border-white/10 bg-black/55 px-8 py-9 shadow-[0_22px_70px_rgba(0,0,0,.75)] backdrop-blur-sm">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#f4b400]/40 bg-[#f4b400]/10 text-5xl shadow-[0_0_45px_rgba(244,180,0,.12)]">🦁</div>
              <h2 className="mt-6 font-display text-3xl font-black uppercase">{state === "live" ? "The Zoo Crew is live" : state === "checking" ? "Checking the habitat" : "The live is offline"}</h2>
              <p className="mt-3 leading-7 text-white/60">{state === "live" ? "The owners have opened the habitat. Enter when you are ready; your camera and mic begin off." : canControlLive ? "The habitat stays closed until an owner starts the live. Press Start Live when the crew is ready." : "Nobody can enter a box until a Zoo Crew owner starts the live. This page checks automatically, so you can stay right here."}</p>
              {state === "error" ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{message}{message.toLowerCase().includes("sign in") ? <a className="ml-2 font-black underline" href="/sign-in?next=/live">Sign in</a> : null}</div> : null}
              {state === "live" ? <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"><button onClick={() => enterRoom("viewer")} className="rounded-full bg-[#f4b400] px-7 py-3.5 font-black text-black">Watch & Comment</button>{canModerate ? <button onClick={() => enterRoom("stage")} className="rounded-full border border-[#f4b400]/45 bg-black/50 px-7 py-3.5 font-black text-[#f4b400]">Enter Host Stage</button> : null}</div> : canControlLive ? <button onClick={startLive} disabled={state === "opening" || state === "checking"} className="mt-7 rounded-full bg-[#f4b400] px-7 py-3.5 font-black text-black disabled:opacity-50">{state === "opening" ? "Starting the live…" : "Start Zoo Crew Live"}</button> : null}
              <p className="mt-4 text-xs uppercase tracking-[.15em] text-white/35">Viewer lobby · Up to 100 inside · Hosts manage the stage</p>
            </div>
        </div>
      </div>
    </section>
  );
}
