import Footer from "@/components/Footer";
import FoundersWall from "@/components/FoundersWall";
import Hero from "@/components/Hero";
import HomeSections from "@/components/HomeSections";
import LiveNowSection from "@/components/LiveNowSection";
import Navbar from "@/components/Navbar";
import SupportStageFront from "@/components/SupportStageFront";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <Navbar />
      <Hero />
      <LiveNowSection />
      <HomeSections />
      <SupportStageFront />
      <FoundersWall />
      <Footer />
    </main>
  );
}
