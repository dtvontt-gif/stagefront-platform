import Footer from "@/components/Footer";
import LiveHosts from "@/components/LiveHosts";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Watch Live | StageFront",
  description:
    "See who is live on StageFront and join the conversation through TikTok.",
};

export default function LivePage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.13),transparent_38%),radial-gradient(circle_at_80%_55%,rgba(244,180,0,0.08),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="section-kicker">StageFront Live</p>
          <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[0.95] sm:text-7xl">
            Watch the show.
            <span className="block text-stage-gold">Join the moment.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/55">
            StageFront brings every published live host into one place. Use the
            live button to watch, comment, gift, and interact through TikTok.
          </p>
          <Link href="/queue" className="primary-cta mt-8">
            Join the performer queue
          </Link>

          <div className="mt-14">
            <LiveHosts />
          </div>

          <aside className="mt-16 rounded-3xl border border-[#f4b400]/20 bg-[#f4b400]/[0.04] p-7 sm:p-10">
            <p className="section-kicker">Broadcasting roadmap</p>
            <h2 className="mt-4 font-display text-3xl font-black uppercase sm:text-4xl">
              The StageFront player is next.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
              This Live hub is ready for a future embedded or simulcast player
              after we select a compatible broadcast service and confirm its
              platform and music-rights requirements. TikTok remains the
              interaction destination today.
            </p>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}
