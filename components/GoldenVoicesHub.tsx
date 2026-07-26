"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Contestant = {
  id: number;
  display_name: string;
  username: string;
  song_title: string;
  song_artist: string;
  status: string;
  votes: number;
};

type Settings = {
  season_title: string;
  upcoming_show_at: string | null;
  finals_at: string | null;
  current_round: string;
  registration_open: boolean;
  voting_open: boolean;
};

const rules = [
  "Golden Voices is free to enter. No entry fee is required.",
  "Contestants must register with accurate contact and performance information.",
  "Be ready when called and follow the host’s live-show instructions.",
  "Performances and community conduct must remain respectful and appropriate.",
  "One community vote is allowed per browser during each voting round.",
  "StageFront administrators make final decisions on eligibility, advancement, and winners.",
];

function showDate(value: string | null) {
  if (!value) return "To be announced";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function GoldenVoicesHub() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votingFor, setVotingFor] = useState<number | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/golden-voices", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { settings?: Settings; contestants?: Contestant[] }) => {
        setSettings(result.settings ?? null);
        setContestants((result.contestants ?? []).sort((a, b) => b.votes - a.votes));
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/golden-voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Registration completed.");
    setSubmitting(false);
    if (response.ok) form.reset();
  }

  async function vote(contestantId: number) {
    setVotingFor(contestantId);
    const response = await fetch("/api/golden-voices/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contestantId }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? "Voting completed.");
    setVotingFor(null);
    if (response.ok) refresh();
  }

  return (
    <div className="space-y-20">
      <section className="grid gap-5 md:grid-cols-2">
        <article className="gv-date-card">
          <p className="section-kicker">Upcoming show</p>
          <h2 className="mt-4 font-display text-3xl font-black uppercase">
            {settings?.current_round ?? "Auditions"}
          </h2>
          <p className="mt-5 text-lg text-white/65">{showDate(settings?.upcoming_show_at ?? null)}</p>
        </article>
        <article className="gv-date-card">
          <p className="section-kicker">Season finals</p>
          <h2 className="mt-4 font-display text-3xl font-black uppercase">Golden Voices Finals</h2>
          <p className="mt-5 text-lg text-white/65">{showDate(settings?.finals_at ?? null)}</p>
        </article>
      </section>

      <section aria-labelledby="gv-rules-heading">
        <p className="section-kicker">Competition rules</p>
        <h2 id="gv-rules-heading" className="mt-4 font-display text-4xl font-black uppercase sm:text-5xl">
          A fair stage for every voice.
        </h2>
        <ol className="mt-8 grid gap-3 lg:grid-cols-2">
          {rules.map((rule, index) => (
            <li key={rule} className="gv-rule">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{rule}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="queue-panel">
          <p className="section-kicker">Free registration</p>
          <h2 className="mt-4 font-display text-4xl font-black uppercase">
            Enter Golden Voices.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/55">
            Registration is free. The $40 Original Artist Showcase fee does not apply to Golden Voices.
          </p>
          <form onSubmit={register} className="mt-8 grid gap-4">
            <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" />
            <label className="form-field"><span>Name</span><input name="displayName" required maxLength={80} /></label>
            <label className="form-field"><span>Email</span><input name="email" type="email" required maxLength={254} /></label>
            <label className="form-field"><span>StageFront username</span><input name="username" required maxLength={24} placeholder="username" /></label>
            <label className="form-field"><span>Song title</span><input name="songTitle" required maxLength={120} /></label>
            <label className="form-field"><span>Original artist</span><input name="songArtist" required maxLength={120} /></label>
            <button type="submit" disabled={!settings?.registration_open || submitting} className="primary-cta mt-2 disabled:opacity-40">
              {submitting ? "Registering..." : settings?.registration_open ? "Register free" : "Registration closed"}
            </button>
          </form>
        </div>

        <div className="queue-panel">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-kicker">Community results</p>
              <h2 className="mt-4 font-display text-4xl font-black uppercase">
                {settings?.current_round ?? "Current"} leaderboard.
              </h2>
            </div>
            <span className={`queue-state ${settings?.voting_open ? "queue-state-open" : ""}`}>
              Voting {settings?.voting_open ? "open" : "closed"}
            </span>
          </div>
          <div className="mt-8 grid gap-3">
            {contestants.map((contestant, index) => (
              <article key={contestant.id} className="gv-contestant">
                <span className="font-display text-2xl font-black text-[#f4b400]">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-black uppercase">{contestant.display_name}</h3>
                  <p className="truncate text-sm text-white/45">{contestant.song_title} · {contestant.song_artist}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-white/30">{contestant.status}</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-black">{contestant.votes}</p>
                  <p className="text-[0.65rem] uppercase tracking-wider text-white/35">votes</p>
                </div>
                <button
                  type="button"
                  disabled={!settings?.voting_open || votingFor !== null}
                  onClick={() => void vote(contestant.id)}
                  className="queue-action queue-action-call disabled:opacity-35"
                >
                  Vote
                </button>
              </article>
            ))}
            {!contestants.length ? <div className="live-empty">Confirmed contestants will appear here.</div> : null}
          </div>
        </div>
      </section>
      {message ? <p aria-live="polite" className="text-center text-sm text-[#f4b400]">{message}</p> : null}
    </div>
  );
}
