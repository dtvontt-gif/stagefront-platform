import Footer from "@/components/Footer";
import LiveQueue from "@/components/LiveQueue";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Live Queue | StageFront",
  description:
    "Join the StageFront performer queue, submit your song, and see when you are up next.",
};

export default function QueuePage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,180,0,0.13),transparent_36%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="section-kicker">Your turn on StageFront</p>
          <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[0.95] sm:text-7xl">
            Stop typing “me.”
            <span className="block text-stage-gold">Claim your place.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/55">
            Submit your song, follow the live order, and know when the host is
            ready to bring you onto the stage.
          </p>
          <div className="mt-14">
            <LiveQueue />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
