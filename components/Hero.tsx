import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-[#070708] px-5 pb-20 pt-28 text-white sm:px-8 sm:pb-28 sm:pt-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(244,180,0,0.16),transparent_34%),radial-gradient(circle_at_85%_55%,rgba(30,94,255,0.12),transparent_35%)]" />
      <div className="hero-haze absolute inset-x-0 bottom-0 h-2/5 opacity-60" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div>
          <p className="hero-reveal text-xs font-bold uppercase tracking-[0.34em] text-[#f4b400] sm:text-sm">
            StageFront presents
          </p>
          <h1 id="hero-heading" className="hero-reveal hero-reveal-delay mt-6 text-balance text-5xl font-black uppercase leading-[0.92] tracking-[-0.045em] sm:text-7xl xl:text-8xl">
            Home of the
            <span className="mt-2 block bg-gradient-to-r from-[#fff4ca] via-[#f4b400] to-[#fff0b3] bg-clip-text text-transparent">Zoo Crew Vibe.</span>
          </h1>
          <p className="hero-reveal hero-reveal-delay-2 mt-7 max-w-2xl text-pretty text-base leading-8 text-white/72 sm:text-xl">
            One family. One community. Three stages. Follow the full Zoo Crew across TikTok, GoLive Streamers, and Echo Live from one independent home.
          </p>
          <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-col gap-4 sm:flex-row">
            <a href="#live" className="primary-cta">Find the live show</a>
            <a href="#superfans" className="rounded-full border border-[#f4b400]/55 bg-black/30 px-8 py-4 text-center text-sm font-extrabold text-[#ffd05a] backdrop-blur-sm transition hover:-translate-y-1 hover:bg-[#f4b400] hover:text-black">Become a Superfan</a>
          </div>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-white/38">Music • Entertainment • Good people • Bigger things</p>
        </div>

        <div className="hero-reveal hero-reveal-delay relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-[#f4b400]/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#f4b400]/35 bg-black shadow-[0_35px_120px_rgba(0,0,0,0.72)]">
            <Image src="/images/zoo-crew/zoo-crew-vibe-house-gate.png" alt="The Zoo Crew Vibe House family at the golden zoo gate" width={1254} height={1254} priority className="h-auto w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
