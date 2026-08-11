"use client";

import { FormEvent, useState } from "react";

export default function AccountForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const requestedDestination = new URLSearchParams(window.location.search).get("next");
    const response = await fetch(mode === "forgot" ? "/api/auth/forgot-password" : `/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        displayName: form.get("displayName"),
        username: form.get("username"),
        next: requestedDestination,
      }),
    });
    const result = (await response.json()) as { message?: string; destination?: string };
    setBusy(false);
    setMessage(result.message ?? "Something went wrong.");
    if (response.ok && result.destination) window.location.assign(result.destination);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-2xl sm:p-8">
      <div className="mb-7 grid grid-cols-2 rounded-full bg-black/40 p-1">
        {(["sign-in", "sign-up"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setMessage("");
            }}
            className={`rounded-full px-4 py-3 text-sm font-bold transition ${
              mode === item ? "bg-[#f4b400] text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {item === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-5">
        {mode === "sign-up" ? <>
          <label className="block text-sm font-semibold text-white/80">Stage name
            <input name="displayName" required minLength={2} maxLength={80} autoComplete="name" className="mt-2 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-[#f4b400]" />
          </label>
          <label className="block text-sm font-semibold text-white/80">Username
            <input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="your_stage_name" className="mt-2 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-[#f4b400]" />
          </label>
        </> : null}
        <label className="block text-sm font-semibold text-white/80">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-[#f4b400]"
          />
        </label>
        {mode !== "forgot" ? <label className="block text-sm font-semibold text-white/80">
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-[#f4b400]"
          />
        </label> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#f4b400] px-6 py-4 font-extrabold text-black transition hover:bg-[#ffd05a] disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "sign-in" ? "Enter StageFront" : mode === "forgot" ? "Send reset link" : "Create account"}
        </button>
      </form>
      {message ? <p aria-live="polite" className="mt-5 text-sm leading-6 text-white/70">{message}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs font-bold">
        {mode === "sign-in" ? <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }} className="text-[#f4b400] hover:text-[#ffd05a]">Forgot password?</button> : null}
        {mode === "forgot" ? <button type="button" onClick={() => { setMode("sign-in"); setMessage(""); }} className="text-[#f4b400] hover:text-[#ffd05a]">Back to sign in</button> : null}
      </div>
      {mode === "sign-up" ? (
        <p className="mt-5 text-center text-xs leading-5 text-white/45">
          Want a member number and profile photo? Complete the{" "}
          <a href="/join" className="font-bold text-[#f4b400]">Founding Member form</a>{" "}
          using this same email.
        </p>
      ) : null}
    </div>
  );
}
