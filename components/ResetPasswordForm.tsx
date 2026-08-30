"use client";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recoveryToken = params.get("type") === "recovery" ? params.get("access_token") || "" : "";
    const recoveryError = params.get("error_description");

    // Recovery tokens are credentials. Remove them from the visible URL and browser history.
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setToken(recoveryToken);
      setMessage(recoveryError || "");
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: token, password }) });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(result.message || "Please try again.");
    setBusy(false);
    if (response.ok) {
      setComplete(true);
      setToken("");
    }
  }

  if (!ready) return <p className="text-white/60">Opening your secure reset link…</p>;
  if (complete) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"><p aria-live="polite" className="text-white/70">{message}</p><a className="primary-cta mt-6" href="/sign-in">Sign in with new password</a></div>;
  if (!token) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"><p className="text-white/65">{message || "This reset link is missing, invalid, or expired."}</p><a className="mt-5 inline-flex font-bold text-[#f4b400]" href="/sign-in">Request another reset link</a></div>;
  return <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
    <label className="form-field"><span>New password</span><input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></label>
    <label className="form-field"><span>Confirm new password</span><input name="confirmation" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></label>
    <button disabled={busy} className="primary-cta w-full">{busy ? "Updating..." : "Update password"}</button>
    {message ? <p aria-live="polite" className="text-sm text-white/65">{message}</p> : null}
  </form>;
}
