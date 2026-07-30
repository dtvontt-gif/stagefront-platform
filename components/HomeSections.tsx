import Image from "next/image";

const experiences = [
  {
    number: "01",
    eyebrow: "Live discovery",
    title: "Golden Voices",
    description:
      "Weekly showcases, community voting, and championship moments built to give exceptional voices a real audience.",
    href: "/golden-voices",
  },
  {
    number: "02",
    eyebrow: "Original music",
    title: "Artist Showcase",
    description:
      "A dedicated home for original songs, artist stories, and the independent talent fans should know next.",
    href: "/originals",
  },
  {
    number: "03",
    eyebrow: "One community",
    title: "StageFront Live",
    description:
      "Fans, artists, producers, and hosts connecting around performances instead of fighting an algorithm.",
    href: "#community",
  },
];

const foundingBenefits = [
  "Founding Member digital badge",
  "Early access to the StageFront beta",
  "Priority competition registration",
  "Permanent Wall of Founders recognition",
];

const communityRoles = [
  {
    label: "Artists",
    copy: "Perform, share originals, build a following, and be discovered.",
  },
  {
    label: "Fans",
    copy: "Find emerging talent early and help elevate the voices you believe in.",
  },
  {
    label: "Producers",
    copy: "Scout fresh talent and build meaningful creative relationships.",
  },
  {
    label: "Hosts",
    copy: "Run showcases, organize live queues, and grow loyal communities.",
    href: "/hosts",
  },
];

export default function HomeSections() {
  return (
    <>
      <section
        id="discover"
        aria-labelledby="discover-heading"
        className="relative scroll-mt-20 overflow-hidden bg-[#070708] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="section-glow section-glow-left" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="section-kicker">The platform</p>
            <h2 id="discover-heading" className="section-title">
              A bigger stage for
              <span className="text-stage-gold"> emerging talent.</span>
            </h2>
            <p className="section-lede">
              StageFront brings live performance, original music, discovery,
              and community together in one premium entertainment experience.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {experiences.map((experience) => (
              <a
                key={experience.number}
                href={experience.href}
                className="feature-card group"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#f4b400]">
                    {experience.eyebrow}
                  </span>
                  <span className="font-display text-3xl font-black text-white/10 transition group-hover:text-[#f4b400]/25">
                    {experience.number}
                  </span>
                </div>
                <h3 className="mt-16 font-display text-3xl font-black uppercase tracking-tight">
                  {experience.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/60">
                  {experience.description}
                </p>
                <span className="mt-8 inline-flex items-center gap-3 text-sm font-bold text-white transition group-hover:text-[#f4b400]">
                  Explore
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        id="golden-voices"
        aria-labelledby="golden-voices-heading"
        className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="absolute inset-0 opacity-35">
          <Image
            src="/images/hero/stagefront-hero-background-alternate.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0b0f_8%,rgba(11,11,15,0.82)_50%,#0b0b0f_100%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="section-kicker">Signature competition</p>
            <h2 id="golden-voices-heading" className="section-title">
              Golden Voices
              <span className="block text-stage-gold">takes center stage.</span>
            </h2>
            <p className="section-lede">
              A recurring showcase where vocalists compete, audiences
              participate, and standout performers move closer to their next
              opportunity.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {["Weekly showcases", "Community voting", "Monthly finals"].map(
                (item) => (
                  <span key={item} className="pill">
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="show-card">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f4b400]">
                  Coming soon
                </p>
                <p className="mt-2 font-display text-2xl font-black uppercase">
                  Season One
                </p>
              </div>
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f4b400]/35 bg-[#f4b400]/10 text-2xl text-[#f4b400]">
                ★
              </span>
            </div>
            <div className="mt-8 space-y-5">
              {[
                ["Showcase", "Artists step into the spotlight"],
                ["Community", "Fans help elevate standout voices"],
                ["Finals", "Top performers meet on the big stage"],
              ].map(([title, copy], index) => (
                <div key={title} className="flex gap-5">
                  <span className="font-display text-sm font-black text-[#f4b400]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-black uppercase">{title}</h3>
                    <p className="mt-1 text-sm text-white/55">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="original-artists"
        aria-labelledby="original-artists-heading"
        className="relative scroll-mt-20 overflow-hidden bg-[#070708] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="section-glow section-glow-right" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-full bg-[#f4b400]/10 blur-3xl" />
              <div className="relative flex h-full items-center justify-center rounded-[2rem] border border-[#f4b400]/20 bg-[linear-gradient(145deg,#17130a,#09090b_60%)] p-12 shadow-2xl">
                <Image
                  src="/images/icons/stagefront-sf-monogram.png"
                  alt="StageFront SF monogram"
                  width={640}
                  height={640}
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            <div>
              <p className="section-kicker">Original Artist Showcase</p>
              <h2 id="original-artists-heading" className="section-title">
                More than a cover.
                <span className="block text-stage-gold">Your own sound.</span>
              </h2>
              <p className="section-lede">
                StageFront Originals will give independent artists space to
                share music, tell their stories, connect with producers, and
                grow a fanbase that follows the journey.
              </p>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {[
                  ["Upload originals", "Give every song a professional home."],
                  ["Build your profile", "Let fans discover the person behind the music."],
                  ["Grow your audience", "Turn performances into lasting connections."],
                  ["Meet collaborators", "Connect with producers and creators."],
                ].map(([title, copy]) => (
                  <div key={title} className="mini-card">
                    <h3 className="font-display font-black uppercase">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="founding-members"
        aria-labelledby="founding-heading"
        className="relative scroll-mt-20 overflow-hidden border-y border-[#f4b400]/20 bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,180,0,0.16),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="section-kicker">The first 1,000</p>
            <h2 id="founding-heading" className="section-title">
              Be there
              <span className="text-stage-gold"> before the spotlight.</span>
            </h2>
            <p className="section-lede">
              Founding Members are the people who believed before StageFront
              became the destination we know it can become.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {foundingBenefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4b400] text-xs font-black text-black">
                    ✓
                  </span>
                  {benefit}
                </div>
              ))}
            </div>

            <a href="/join" className="primary-cta mt-10">
              Join the founding generation
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full bg-[#f4b400]/20 blur-3xl" />
            <Image
              src="/images/icons/stagefront-profile-icon.png"
              alt="StageFront Founding Member badge"
              width={900}
              height={900}
              className="relative h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section
        id="community"
        aria-labelledby="community-heading"
        className="scroll-mt-20 bg-[#070708] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">One connected community</p>
            <h2 id="community-heading" className="section-title">
              Everyone has a place
              <span className="text-stage-gold"> at StageFront.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {communityRoles.map((role, index) =>
              "href" in role ? (
              <a
                key={role.label}
                href={role.href}
                className="group bg-[#0b0b0f] p-8 transition hover:bg-[#f4b400]/[0.07]"
              >
                <span className="font-display text-xs font-black text-[#f4b400]">
                  0{index + 1}
                </span>
                <h3 className="mt-10 font-display text-2xl font-black uppercase">
                  {role.label}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/55">{role.copy}</p>
                <span className="mt-6 inline-flex text-sm font-black text-[#f4b400]">
                  View hosts →
                </span>
              </a>
              ) : (
                <div key={role.label} className="bg-[#0b0b0f] p-8">
                  <span className="font-display text-xs font-black text-[#f4b400]">
                    0{index + 1}
                  </span>
                  <h3 className="mt-10 font-display text-2xl font-black uppercase">
                    {role.label}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/55">{role.copy}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="about"
        aria-labelledby="about-heading"
        className="relative scroll-mt-20 overflow-hidden bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-xs">
            <div className="absolute inset-0 rounded-full bg-[#f4b400]/15 blur-3xl" />
            <Image
              src="/images/icons/stagefront-spotlight-icon.png"
              alt=""
              width={700}
              height={700}
              className="relative h-auto w-full"
            />
          </div>
          <div>
            <p className="section-kicker">Why StageFront exists</p>
            <h2 id="about-heading" className="section-title">
              Talent should be discovered
              <span className="text-stage-gold"> by community—not luck.</span>
            </h2>
            <p className="section-lede">
              StageFront began with a live community, a belief in overlooked
              talent, and one simple idea: every artist deserves a real stage.
              We are building the place where performances become
              opportunities and audiences become part of the discovery.
            </p>
            <p className="mt-8 font-display text-xl font-black uppercase tracking-tight text-white">
              The front row for fans.
              <span className="block text-[#f4b400]">The big stage for artists.</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
