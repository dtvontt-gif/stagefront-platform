import Footer from "@/components/Footer";
import GoldenVoicesHub from "@/components/GoldenVoicesHub";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Golden Voices | StageFront",
  description:
    "Register free for Golden Voices, see upcoming shows and finals, vote, and follow the leaderboard.",
};

export default function GoldenVoicesPage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,180,0,0.16),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="section-kicker">StageFront signature competition</p>
          <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[0.95] sm:text-7xl">
            Golden Voices.
            <span className="block text-stage-gold">Your voice. Your moment.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/55">
            Enter free, perform live, earn community support, and rise through
            weekly shows toward the Golden Voices Finals.
          </p>
          <div className="mt-16">
            <GoldenVoicesHub />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
