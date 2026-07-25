import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#070708] px-5 pb-20 pt-32 text-center text-white sm:px-8 sm:pt-36"
    >
      <Image
        src="/images/hero/stagefront-hero-background.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,8,0.62)_0%,rgba(7,7,8,0.28)_38%,rgba(7,7,8,0.7)_78%,#070708_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(244,180,0,0.15),transparent_34%)]" />
      <div className="hero-haze absolute inset-x-0 bottom-0 h-2/5 opacity-60" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <p className="hero-reveal text-xs font-bold uppercase tracking-[0.38em] text-[#f4b400] sm:text-sm">
          Discover. Elevate. Perform.
        </p>

        <h1
          id="hero-heading"
          className="hero-reveal hero-reveal-delay mt-6 text-balance text-4xl font-black uppercase leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl xl:text-8xl"
        >
          We don&apos;t build stars.
          <span className="mt-2 block bg-gradient-to-r from-[#fff4ca] via-[#f4b400] to-[#fff0b3] bg-clip-text text-transparent">
            We build the stage
          </span>
          <span className="mt-2 block text-white">where stars are discovered.</span>
        </h1>

        <p className="hero-reveal hero-reveal-delay-2 mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-white/72 sm:text-xl sm:leading-8">
          The front row for fans. The big stage for artists. Join a community
          built to help talent be seen, heard, and celebrated.
        </p>

        <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <a
            href="/join"
            className="rounded-full bg-[#f4b400] px-8 py-4 text-sm font-extrabold text-[#0b0b0f] shadow-[0_0_36px_rgba(244,180,0,0.28)] transition hover:-translate-y-1 hover:bg-[#ffd05a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4b400] sm:text-base"
          >
            Become a Founding Member
          </a>
          <a
            href="#about"
            className="rounded-full border border-white/35 bg-black/25 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#f4b400]/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-base"
          >
            Watch the Vision
          </a>
        </div>
      </div>

      <a
        href="#discover"
        aria-label="Explore StageFront"
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/50 transition hover:text-[#f4b400]"
      >
        Explore
        <span aria-hidden="true" className="scroll-cue h-8 w-px bg-gradient-to-b from-[#f4b400] to-transparent" />
      </a>
    </section>
  );
}
