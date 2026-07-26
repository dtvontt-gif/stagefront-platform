import Footer from "@/components/Footer";
import HostsDirectory from "@/components/HostsDirectory";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "StageFront Hosts | Watch Live",
  description: "Discover StageFront hosts, visit their TikTok profiles, and watch when they go live.",
};

export default function HostsPage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-7xl">
          <p className="section-kicker">The people building the stage</p>
          <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[0.95] sm:text-7xl">
            Meet the hosts.
            <span className="block text-stage-gold">Join them live.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/55">
            Follow StageFront hosts on TikTok and jump directly into their live broadcasts when
            the red LIVE badge appears.
          </p>
          <HostsDirectory />
        </div>
      </section>
      <Footer />
    </main>
  );
}
