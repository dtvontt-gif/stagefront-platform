"use client";

import { useEffect, useState } from "react";

type RoomStatus = "checking" | "offline" | "live" | "error";

const rooms = [
  {
    id: "zoo",
    name: "Zoo Crew Live",
    href: "/live/zoo",
    icon: "🦁",
    description: "Enter the nighttime habitat with the main stage and eight Zoo Crew cages.",
    classes:
      "border-[#f4b400]/35 bg-[radial-gradient(circle_at_70%_16%,rgba(244,180,0,.18),transparent_28%),linear-gradient(145deg,#142018,#070a08_70%)]",
  },
  {
    id: "jungle",
    name: "The Jungle",
    href: "/jungle",
    icon: "🌿",
    description: "Step beneath the canopy, wait On Deck, and swing into center stage on the vines.",
    classes:
      "border-emerald-500/35 bg-[radial-gradient(circle_at_25%_20%,rgba(34,197,94,.28),transparent_30%),linear-gradient(145deg,#12391d,#031008_72%)]",
  },
] as const;

export default function LiveDirectory() {
  const [statuses, setStatuses] = useState<Record<string, RoomStatus>>({
    zoo: "checking",
    jungle: "checking",
  });

  useEffect(() => {
    let active = true;
    async function refresh() {
      const results = await Promise.all(
        rooms.map(async (room) => {
          try {
            const response = await fetch(
              `/api/live/room?experience=${room.id}`,
              { cache: "no-store" },
            );
            if (!response.ok) return [room.id, "error"] as const;
            const data = (await response.json()) as { isLive?: boolean };
            return [room.id, data.isLive ? "live" : "offline"] as const;
          } catch {
            return [room.id, "error"] as const;
          }
        }),
      );
      if (active) setStatuses(Object.fromEntries(results));
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-4 py-10 sm:px-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(244,180,0,.12),transparent_28%),radial-gradient(circle_at_85%_8%,rgba(34,197,94,.14),transparent_30%),linear-gradient(180deg,#07100b,#030504)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-white/65">
            StageFront Live Rooms
          </span>
          <h1 className="mt-6 font-display text-4xl font-black uppercase sm:text-6xl">
            Choose your live
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/55">
            Both rooms share your StageFront account, wallet, gifts, and live controls. Each room runs separately.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {rooms.map((room) => {
            const status = statuses[room.id];
            return (
              <a
                key={room.id}
                href={room.href}
                className={`group relative min-h-[28rem] overflow-hidden rounded-[2.25rem] border p-7 shadow-[0_28px_80px_rgba(0,0,0,.6)] transition hover:-translate-y-1 hover:brightness-110 ${room.classes}`}
              >
                {room.id === "jungle" ? (
                  <div aria-hidden="true" className="jungle-canopy absolute inset-x-0 top-0 h-20 opacity-90" />
                ) : null}
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="grid h-20 w-20 place-items-center rounded-full border border-white/15 bg-black/35 text-5xl">
                      {room.icon}
                    </span>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${status === "live" ? "bg-red-500 text-white" : "bg-black/45 text-white/55"}`}>
                      {status === "live"
                        ? "● Live now"
                        : status === "checking"
                          ? "Checking…"
                          : status === "error"
                            ? "Sign in to check"
                            : "Offline"}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
                      {room.name}
                    </h2>
                    <p className="mt-3 max-w-md leading-7 text-white/60">
                      {room.description}
                    </p>
                    <span className="mt-7 inline-flex rounded-full bg-[#f4b400] px-6 py-3 font-black text-black transition group-hover:bg-[#ffd05a]">
                      Enter room →
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
