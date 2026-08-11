"use client";

import { useEffect, useMemo, useState } from "react";
import ContentComments from "@/components/ContentComments";

type Winner = {
  id: number;
  display_name: string;
  competition: "box_battle" | "golden_voices";
  title: string;
  season_label: string;
  bio: string;
  photo_url: string | null;
  video_url: string | null;
  social_url: string | null;
  featured: boolean;
  won_at: string | null;
};

function competitionName(value: Winner["competition"]) {
  return value === "box_battle" ? "Box Battle" : "Golden Voices";
}

function youtubeEmbed(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const id =
      parsed.hostname.includes("youtu.be")
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v") ??
          (parsed.pathname.startsWith("/shorts/") ? parsed.pathname.split("/")[2] : null) ??
          (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null);
    return id && /^[\w-]{6,20}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

export default function WinnersSpotlight() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/winners", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { winners?: Winner[] }) => {
        const rows = result.winners ?? [];
        setWinners(rows);
        setSelectedId(rows.find((winner) => winner.featured)?.id ?? rows[0]?.id ?? null);
      })
      .finally(() => setLoaded(true));
  }, []);

  const selected = useMemo(
    () => winners.find((winner) => winner.id === selectedId) ?? winners[0],
    [selectedId, winners],
  );
  const embedUrl = youtubeEmbed(selected?.video_url ?? null);

  return (
    <section id="winners" aria-labelledby="winners-heading" className="winners-section scroll-mt-20">
      <div className="winners-light winners-light-left" />
      <div className="winners-light winners-light-right" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-kicker">Hall of champions</p>
          <h2 id="winners-heading" className="section-title">
            Their moment.
            <span className="text-stage-gold"> Their stage.</span>
          </h2>
          <p className="section-lede mx-auto">
            Celebrating the voices and performers who rose to the moment in
            Box Battle and Golden Voices.
          </p>
        </div>

        {!loaded ? <p className="mt-16 text-center text-white/45">Opening the winners spotlight...</p> : null}

        {loaded && !selected ? (
          <div className="winners-empty">
            <span className="winners-crown" aria-hidden="true">★</span>
            <h3>The first spotlight is waiting.</h3>
            <p>StageFront champions will be honored here with their story and performance.</p>
          </div>
        ) : null}

        {selected ? (
          <>
            <article className="winner-feature">
              <div className="winner-photo-shell">
                {selected.photo_url ? (
                  // Remote winner photos are administrator-approved URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.photo_url} alt={`${selected.display_name}, ${selected.title}`} className="winner-photo" />
                ) : (
                  <div className="winner-photo-placeholder" aria-label={`${selected.display_name} photo placeholder`}>
                    {selected.display_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="winner-photo-shine" />
                <span className="winner-badge">Winner</span>
              </div>

              <div className="winner-story">
                <p className="winner-competition">{competitionName(selected.competition)}</p>
                <h3>{selected.display_name}</h3>
                <p className="winner-title">{selected.title}</p>
                {selected.season_label ? <p className="winner-season">{selected.season_label}</p> : null}
                {selected.bio ? <p className="winner-bio">{selected.bio}</p> : null}
                <div className="winner-links">
                  {selected.video_url ? (
                    <a href="#winner-performance" className="primary-cta">Watch the performance</a>
                  ) : null}
                  {selected.social_url ? (
                    <a href={selected.social_url} target="_blank" rel="noreferrer" className="secondary-cta">
                      Visit their profile
                    </a>
                  ) : null}
                </div>
              </div>
            </article>

            {selected.video_url ? (
              <div id="winner-performance" className="winner-video-shell">
                <div className="winner-video-heading">
                  <div>
                    <p className="section-kicker">Featured performance</p>
                    <h3>{selected.display_name} takes the stage</h3>
                  </div>
                  {!embedUrl ? (
                    <a href={selected.video_url} target="_blank" rel="noreferrer" className="secondary-cta">
                      Open video
                    </a>
                  ) : null}
                </div>
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={`${selected.display_name} featured performance`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="winner-video-link">
                    <span aria-hidden="true">▶</span>
                    <p>This performance opens on the artist&apos;s video page.</p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mx-auto mt-6 max-w-[68rem]">
              <ContentComments contentType="winner" contentId={selected.id} heading={`Celebrate ${selected.display_name}`} />
            </div>

            {winners.length > 1 ? (
              <div className="winner-gallery" aria-label="More StageFront winners">
                {winners.map((winner) => (
                  <button
                    key={winner.id}
                    type="button"
                    aria-pressed={winner.id === selected.id}
                    onClick={() => setSelectedId(winner.id)}
                    className="winner-thumbnail"
                  >
                    {winner.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={winner.photo_url} alt="" />
                    ) : (
                      <span>{winner.display_name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="winner-thumbnail-copy">
                      <strong>{winner.display_name}</strong>
                      <small>{competitionName(winner.competition)}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

