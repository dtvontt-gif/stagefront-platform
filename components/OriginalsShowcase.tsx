"use client";

import { useEffect, useState } from "react";

type Song = {
  id: number;
  artist_name: string;
  song_title: string;
  genre: string;
  artist_bio: string;
  story: string;
  audio_url: string;
  featured: boolean;
};

export default function OriginalsShowcase() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/originals", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { songs?: Song[] }) => setSongs(result.songs ?? []))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className="originals-showcase">
      <div className="mx-auto max-w-7xl">
        <div className="originals-heading">
          <div>
            <p className="section-kicker">Original Artist Showcase</p>
            <h1>Music with a reason<br /><span className="text-stage-gold">to be heard.</span></h1>
            <p>Discover independent artists through both their sound and the story that made it possible.</p>
          </div>
          <a href="/originals/submit" className="primary-cta">Share your original</a>
        </div>

        {!loaded ? <p className="mt-14 text-white/45">Opening the showcase...</p> : null}
        {loaded && !songs.length ? (
          <div className="originals-empty">
            <p className="section-kicker">The stage is open</p>
            <h2>Be the first original heard here.</h2>
            <p>StageFront is looking for music with honesty, purpose, and a story worth sharing.</p>
            <a href="/originals/submit" className="primary-cta mt-6">Submit your song</a>
          </div>
        ) : null}

        <div className="originals-grid">
          {songs.map((song) => (
            <article key={song.id} className={`original-song-card${song.featured ? " original-song-featured" : ""}`}>
              <div className="original-song-mark" aria-hidden="true">SF</div>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="pill">{song.featured ? "Featured original" : "StageFront original"}</span>
                  {song.genre ? <span className="text-xs font-bold text-white/35">{song.genre}</span> : null}
                </div>
                <h2>{song.song_title}</h2>
                <p className="original-artist-name">by {song.artist_name}</p>
                {song.artist_bio ? <p className="original-bio">{song.artist_bio}</p> : null}
                <audio controls preload="none" src={song.audio_url} className="original-audio">
                  Your browser does not support audio playback.
                </audio>
                <div className="original-story">
                  <p className="section-kicker">Behind the music</p>
                  <p>{song.story}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

