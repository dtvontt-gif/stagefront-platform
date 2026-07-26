"use client";

import { useEffect, useMemo, useState } from "react";

type Member = {
  founder_number: number;
  display_name: string;
  email: string;
  username: string;
  role: string;
  show_on_wall: boolean;
};

export default function AdminFounders() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading Founding Members...");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/founding-members", { cache: "no-store" });
    const result = (await response.json()) as { members?: Member[]; message?: string };
    setMembers(result.members ?? []);
    setMessage(result.message ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      [String(member.founder_number), member.display_name, member.email, member.username, member.role]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [members, search]);

  async function override(member: Member) {
    const nextValue = !member.show_on_wall;
    const reason = window.prompt("Optional reason for this Wall override:") ?? "";
    if (!window.confirm("Save this override? Founding Member status will not change.")) return;
    setBusy(member.founder_number);
    const response = await fetch("/api/admin/founding-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        founderNumber: member.founder_number,
        showOnWall: nextValue,
        reason,
      }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Override completed.");
    setBusy(null);
    if (response.ok) await load();
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Administrator control</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">
            Wall of <span className="text-stage-gold">Founders.</span>
          </h1>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search members"
          className="w-full rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm text-white outline-none focus:border-[#f4b400] sm:max-w-sm"
        />
      </div>
      {message ? <p aria-live="polite" className="mb-5 text-sm text-white/60">{message}</p> : null}
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-5 py-4">Founder</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Wall</th>
                <th className="px-5 py-4">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/20">
              {filtered.map((member) => (
                <tr key={member.founder_number}>
                  <td className="px-5 py-4">
                    <p className="font-bold">#{member.founder_number} {member.display_name}</p>
                    <p className="mt-1 text-white/45">@{member.username} · {member.email}</p>
                  </td>
                  <td className="px-5 py-4 capitalize text-white/70">{member.role}</td>
                  <td className="px-5 py-4">
                    <span className={member.show_on_wall ? "text-emerald-300" : "text-white/40"}>
                      {member.show_on_wall ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={busy === member.founder_number}
                      onClick={() => void override(member)}
                      className="rounded-full border border-[#f4b400]/40 px-4 py-2 font-bold text-[#f4b400] hover:bg-[#f4b400] hover:text-black disabled:opacity-50"
                    >
                      {member.show_on_wall ? "Remove from Wall" : "Add to Wall"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? <p className="px-6 py-12 text-center text-white/45">No matching members.</p> : null}
      </div>
    </section>
  );
}
