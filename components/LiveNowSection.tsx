import Link from "next/link";
import LiveHosts from "@/components/LiveHosts";

export default function LiveNowSection() {
  return (
    <section
      id="live"
      aria-labelledby="live-heading"
      className="relative scroll-mt-20 overflow-hidden border-b border-white/10 bg-[#070708] px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(239,68,68,0.12),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(244,180,0,0.08),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <p className="section-kicker">Live discovery</p>
            <h2 id="live-heading" className="section-title">
              Who&apos;s live
              <span className="text-stage-gold"> right now?</span>
            </h2>
            <p className="section-lede">
              Preview the StageFront hosts broadcasting now. Tap any live card
              to open TikTok and join the conversation.
            </p>
          </div>
          <Link href="/live" className="support-cta shrink-0">
            Open the Live hub
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-8"><LiveHosts compact /></div>
      </div>
    </section>
  );
}
