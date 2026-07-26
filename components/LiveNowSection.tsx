import Link from "next/link";
import LiveHosts from "@/components/LiveHosts";

export default function LiveNowSection() {
  return (
    <section
      id="live"
      aria-labelledby="live-heading"
      className="relative scroll-mt-20 overflow-hidden bg-[#070708] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(239,68,68,0.12),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(244,180,0,0.08),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <p className="section-kicker">Watch now</p>
            <h2 id="live-heading" className="section-title">
              When the light turns red,
              <span className="text-stage-gold"> the stage is live.</span>
            </h2>
            <p className="section-lede">
              See which StageFront hosts are broadcasting, jump into their
              TikTok Live, and become part of the show.
            </p>
          </div>
          <Link href="/live" className="support-cta shrink-0">
            Open the Live hub
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <LiveHosts compact />
      </div>
    </section>
  );
}
