"use client";
import { FormEvent, useState } from "react";

export default function ResetPasswordForm() {
  const [token] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(location.hash.slice(1)).get("access_token") || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: token, password }) });
    const result = await response.json() as { message?: string }; setMessage(result.message || "Please try again."); setBusy(false);
  }
  if (!token) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"><p className="text-white/65">This reset link is invalid or expired.</p><a className="mt-5 inline-flex font-bold text-[#f4b400]" href="/sign-in">Request another reset link</a></div>;
  return <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
    <label className="form-field"><span>New password</span><input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
    <button disabled={busy} className="primary-cta w-full">{busy ? "Updating..." : "Update password"}</button>
    {message ? <p aria-live="polite" className="text-sm text-white/65">{message}</p> : null}
  </form>;
}
