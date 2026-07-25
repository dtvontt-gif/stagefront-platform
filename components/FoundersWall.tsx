"use client";

import { useEffect, useState } from "react";

type Founder = {
  founder_number: number;
  display_name: string;
  username: string;
  role: "fan" | "artist" | "producer" | "host";
};

export default function FoundersWall() {
  const [founders, setFounders] = useState<Founder[]>([]);

  useEffect(() => {
    let active = true;

    fetch("/api/founding-members")
      .then((response) => response.json())
      .then((data: { founders?: Founder[] }) => {
        if (active && Array.isArray(data.founders)) {
          setFounders(data.founders);
        }
      })
      .catch(() => {
        if (active) setFounders([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="wall-of-founders"
      aria-labelledby="founders-wall-heading"
      className="border-b border-white/10 bg-[#070708] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Permanent recognition</p>
            <h2 id="founders-wall-heading" className="section-title">
              The Wall
              <span className="text-stage-gold"> of Founders.</span>
            </h2>
            <p className="section-lede">
              A permanent record of the first people who believed every artist
              deserved a real stage.
            </p>
          </div>
          <a href="/join" className="primary-cta shrink-0">
            Add your name
          </a>
        </div>

        {founders.length ? (
          <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {founders.map((founder) => (
              <li
                key={founder.founder_number}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b0b0f] p-5"
              >
                <span className="font-display text-xs font-black text-[#f4b400]">
                  #{String(founder.founder_number).padStart(4, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display font-black uppercase">
                    {founder.display_name}
                  </p>
                  <p className="mt-1 truncate text-xs capitalize text-white/42">
                    @{founder.username} · {founder.role}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-14 rounded-3xl border border-dashed border-[#f4b400]/25 bg-[#f4b400]/[0.035] px-6 py-12 text-center">
            <p className="font-display text-xl font-black uppercase">
              The first names are waiting for the spotlight.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/48">
              Public names will appear here automatically after registration
              and only when a member chooses Wall of Founders recognition.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
