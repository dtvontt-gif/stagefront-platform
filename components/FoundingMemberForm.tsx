"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FormState = "idle" | "submitting" | "success" | "error";

const roles = ["Fan", "Artist", "Producer", "Host"] as const;

export default function FoundingMemberForm() {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/founding-members", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "We could not complete your registration.");
      }

      form.reset();
      setState("success");
      setMessage(
        result.message ||
          "Welcome to StageFront. Your Founding Member registration is confirmed.",
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className="rounded-3xl border border-[#f4b400]/35 bg-[#f4b400]/8 p-8 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4b400] text-2xl font-black text-black">
          ✓
        </div>
        <h2 className="mt-6 font-display text-2xl font-black uppercase">
          You&apos;re on the list.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/65">
          {message}
        </p>
        <Link href="/" className="primary-cta mt-7">
          Return to StageFront
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="join-form">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="form-field">
          <span>Full name</span>
          <input
            required
            autoComplete="name"
            name="displayName"
            maxLength={80}
            placeholder="Your name"
          />
        </label>

        <label className="form-field">
          <span>Email address</span>
          <input
            required
            autoComplete="email"
            name="email"
            type="email"
            maxLength={254}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="form-field">
        <span>Reserve your username</span>
        <div className="username-field">
          <span aria-hidden="true">@</span>
          <input
            required
            autoComplete="username"
            name="username"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_]+"
            title="Use 3–24 letters, numbers, or underscores."
            placeholder="stage_name"
          />
        </div>
        <small>Use 3–24 letters, numbers, or underscores.</small>
      </label>

      <fieldset>
        <legend>I&apos;m joining as a...</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roles.map((role) => (
            <label key={role} className="role-choice">
              <input required type="radio" name="role" value={role.toLowerCase()} />
              <span>{role}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="form-field">
        <span>Profile photo (optional)</span>
        <input
          name="profilePhoto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="profile-file-input"
        />
        <small>
          JPG, PNG, or WebP up to 5 MB. StageFront adds the stage-curtain frame
          and your permanent member number automatically.
        </small>
      </label>

      <label className="flex items-start gap-3 text-sm leading-6 text-white/65">
        <input
          type="checkbox"
          name="showOnWall"
          className="mt-1 h-4 w-4 accent-[#f4b400]"
        />
        Display my name, username, and role on the public Wall of Founders. My
        email will always remain private.
      </label>

      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-100"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="primary-cta w-full disabled:cursor-wait disabled:opacity-60"
      >
        {state === "submitting" ? "Reserving your spot..." : "Become a Founding Member"}
      </button>

      <p className="text-center text-xs leading-5 text-white/35">
        By joining, you agree to receive essential StageFront launch updates.
        We will never publish or sell your email address.
      </p>
    </form>
  );
}
