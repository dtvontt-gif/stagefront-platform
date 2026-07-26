const supportOptions = [
  {
    eyebrow: "Community support",
    title: "Support StageFront",
    description:
      "Choose any amount to help us grow the community, improve live experiences, and create more opportunities for emerging artists.",
    cta: "Make a donation",
    href: "https://www.paypal.com/ncp/payment/TJJ4VKY927A6J",
    accent: "01",
  },
  {
    eyebrow: "Partners & prizes",
    title: "Sponsor an Event",
    description:
      "Help fund contest prizes, showcases, and special StageFront events while supporting the artists who step into the spotlight.",
    cta: "Become a sponsor",
    href: "https://www.paypal.com/ncp/payment/6235Y7RCZFU72",
    accent: "02",
  },
  {
    eyebrow: "Competitions & showcases",
    title: "Pay an Entry Fee",
    description:
      "Submit the official $40 entry fee for an eligible StageFront competition or Original Artist Showcase.",
    cta: "Pay the $40 entry fee",
    href: "https://www.paypal.com/ncp/payment/TNTG33EFH58FY",
    accent: "03",
  },
];

export default function SupportStageFront() {
  return (
    <section
      id="support"
      aria-labelledby="support-heading"
      className="relative scroll-mt-20 overflow-hidden border-y border-[#f4b400]/20 bg-[#0b0b0f] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,180,0,0.15),transparent_42%)]" />
      <div className="section-glow section-glow-left" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-kicker">Help build the stage</p>
          <h2 id="support-heading" className="section-title mx-auto">
            Turn support into
            <span className="text-stage-gold"> opportunity.</span>
          </h2>
          <p className="section-lede mx-auto">
            Support the community, sponsor unforgettable moments, or enter an
            eligible competition through StageFront&apos;s secure PayPal
            checkout.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {supportOptions.map((option) => (
            <article key={option.title} className="support-card">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f4b400]">
                  {option.eyebrow}
                </p>
                <span className="font-display text-3xl font-black text-white/10">
                  {option.accent}
                </span>
              </div>

              <h3 className="mt-12 font-display text-3xl font-black uppercase tracking-tight">
                {option.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-7 text-white/60">
                {option.description}
              </p>

              <a
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                className="support-cta mt-9"
              >
                {option.cta}
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>

        <p className="mt-7 text-center text-xs leading-6 text-white/35">
          Payments are processed securely by PayPal. Entry fees should only be
          paid for currently eligible StageFront competitions or showcases.
        </p>
      </div>
    </section>
  );
}
