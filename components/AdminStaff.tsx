"use client";

import { FormEvent, useEffect, useState } from "react";

type Staff = { id: number; email: string; display_name?: string | null; role: "owner" | "manager" | "moderator"; active: boolean };
const descriptions = {
  owner: "Full access, including staff levels and future financial reports.",
  manager: "Profiles, hosts, queues, contests, and operations. No financial access.",
  moderator: "Queues and contestant status only.",
};

export default function AdminStaff() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/admin/staff", { cache: "no-store" });
    const result = (await response.json()) as { staff?: Staff[]; message?: string };
    setStaff(result.staff ?? []); setMessage(result.message ?? "");
  }
  useEffect(() => { void load(); }, []);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), displayName: data.get("displayName"), role: data.get("role") }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Staff access saved.");
    if (response.ok) { form.reset(); await load(); }
  }
  async function update(person: Staff, role: Staff["role"], active: boolean) {
    const response = await fetch("/api/admin/staff", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: person.id, role, active }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Staff access updated.");
    if (response.ok) await load();
  }
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="section-kicker">Owner-only control</p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Staff <span className="text-stage-gold">Access.</span></h2>
      <p className="mt-4 max-w-3xl text-white/55">Add a person using the same email they use to sign in. Only Owners can see this section or assign access levels.</p>
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {(Object.keys(descriptions) as Staff["role"][]).map((role) => (
          <div key={role} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="font-display font-black uppercase text-[#f4b400]">{role}</p>
            <p className="mt-2 text-sm leading-6 text-white/50">{descriptions[role]}</p>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-8 grid gap-4 rounded-3xl border border-[#f4b400]/20 bg-[#f4b400]/[0.035] p-6 md:grid-cols-[1fr_1fr_180px_auto]">
        <input required name="displayName" placeholder="Staff name" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" />
        <input required name="email" type="email" placeholder="Their sign-in email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white" />
        <select name="role" className="rounded-xl border border-white/15 bg-[#111] px-4 py-3 text-white">
          <option value="moderator">Moderator</option><option value="manager">Manager</option><option value="owner">Owner</option>
        </select>
        <button className="rounded-xl bg-[#f4b400] px-5 py-3 font-black text-black">Add Staff</button>
      </form>
      {message ? <p className="mt-4 text-sm text-white/60">{message}</p> : null}
      <div className="mt-7 grid gap-3">
        {staff.map((person) => (
          <div key={person.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center">
            <div className="flex-1"><p className="font-bold">{person.display_name || person.email}</p><p className="text-sm text-white/45">{person.email} · {person.active ? "Active" : "Disabled"}</p></div>
            <select value={person.role} onChange={(event) => void update(person, event.target.value as Staff["role"], person.active)} className="rounded-xl border border-white/15 bg-[#111] px-4 py-2 text-white">
              <option value="moderator">Moderator</option><option value="manager">Manager</option><option value="owner">Owner</option>
            </select>
            <button onClick={() => void update(person, person.role, !person.active)} className="rounded-full border border-white/20 px-4 py-2 font-bold text-white/70">{person.active ? "Disable" : "Enable"}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
