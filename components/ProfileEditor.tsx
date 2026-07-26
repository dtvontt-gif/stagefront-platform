"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StagePortrait from "@/components/StagePortrait";

type Member = {
  founder_number: number;
  display_name: string;
  username: string;
  role: string;
  show_on_wall: boolean;
  profile_image_url?: string | null;
};

export default function ProfileEditor() {
  const searchParams = useSearchParams();
  const managedMember = searchParams.get("member");
  const [member, setMember] = useState<Member | null>(null);
  const [message, setMessage] = useState("Loading your profile...");
  const [busy, setBusy] = useState(false);

  async function load() {
    const query = managedMember ? `?member=${encodeURIComponent(managedMember)}` : "";
    const response = await fetch(`/api/profile${query}`, { cache: "no-store" });
    const result = (await response.json()) as { member?: Member; message?: string };
    setMember(result.member ?? null);
    setMessage(result.message ?? "");
  }

  useEffect(() => { void load(); }, [managedMember]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (managedMember) formData.set("founderNumber", managedMember);
    const response = await fetch("/api/profile", { method: "PATCH", body: formData });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Profile updated.");
    setBusy(false);
    if (response.ok) {
      form.reset();
      await load();
    }
  }

  if (!member) return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/65">{message}</p>;

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <div>
        <StagePortrait imageUrl={member.profile_image_url} memberNumber={member.founder_number} name={member.display_name} />
        <p className="mt-5 text-center text-sm text-white/45">Your original photo stays clean. The stage frame and member number are added by StageFront.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <p className="section-kicker">{managedMember ? "Administrator editing" : "Your profile"} · Member #{String(member.founder_number).padStart(4, "0")}</p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase">{member.display_name}</h2>
        <p className="mt-2 capitalize text-white/50">@{member.username} · {member.role}</p>
        <form onSubmit={save} className="mt-8 grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="form-field">
              <span>Display name</span>
              <input name="displayName" defaultValue={member.display_name} required minLength={2} maxLength={80} />
            </label>
            <label className="form-field">
              <span>Username</span>
              <input name="username" defaultValue={member.username} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" />
            </label>
          </div>
          <fieldset>
            <legend>Member role</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["fan", "artist", "producer", "host"].map((role) => (
                <label key={role} className="role-choice">
                  <input type="radio" name="role" value={role} defaultChecked={member.role === role} />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-3 text-sm text-white/65">
            <input type="checkbox" name="showOnWall" defaultChecked={member.show_on_wall} className="h-4 w-4 accent-[#f4b400]" />
            Show this member on the Wall of Founders
          </label>
          <label className="form-field">
            <span>Change profile photo</span>
            <input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" className="profile-file-input" />
            <small>JPG, PNG, or WebP. Maximum 5 MB.</small>
          </label>
          {member.profile_image_url ? (
            <label className="flex items-center gap-3 text-sm text-white/65">
              <input type="checkbox" name="removePhoto" value="true" className="h-4 w-4 accent-[#f4b400]" />
              Remove my current photo
            </label>
          ) : null}
          <button disabled={busy} className="primary-cta disabled:opacity-50">
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </form>
        {message ? <p aria-live="polite" className="mt-5 text-sm text-white/60">{message}</p> : null}
      </div>
    </div>
  );
}
