export default function LiveNowSection() {
  const platform = process.env.ZOO_CREW_LIVE_PLATFORM?.trim();
  const liveUrl = process.env.ZOO_CREW_LIVE_URL?.trim();
  const liveTitle = process.env.ZOO_CREW_LIVE_TITLE?.trim() || "The next full-family show is being scheduled.";
  const isLive = Boolean(platform && liveUrl);

  return (
    <section
      id="live"
      aria-labelledby="live-heading"
      className="relative scroll-mt-20 overflow-hidden border-b border-white/10 bg-[#070708] px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(239,68,68,0.12),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(244,180,0,0.08),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-[#f4b400]/30 bg-[linear-gradient(135deg,rgba(244,180,0,0.12),rgba(255,255,255,0.025))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={isLive ? "live-status" : "live-status live-status-offline"}>{isLive ? "Live now" : "Currently offline"}</span>
              {platform ? <span className="pill">Broadcasting on {platform}</span> : null}
            </div>
            <p className="section-kicker mt-7">Zoo Crew broadcast center</p>
            <h2 id="live-heading" className="mt-4 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">
              {isLive ? "The family is live." : "One crew. Three stages."}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/62">{liveTitle}</p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/60">
              <span className="pill">TikTok</span><span className="pill">GLS</span><span className="pill">Echo Live</span>
            </div>
          </div>
          {isLive ? <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex shrink-0 rounded-full bg-red-500 px-8 py-4 font-black uppercase tracking-wide text-white shadow-[0_0_38px_rgba(239,68,68,0.3)] transition hover:-translate-y-1 hover:bg-red-400 lg:mt-0">Join the live →</a> : <a href="#superfans" className="support-cta mt-8 shrink-0 lg:mt-0">Join the Zoo Crew community →</a>}
        </div>
      </div>
    </section>
  );
}
