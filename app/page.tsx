import Footer from "@/components/Footer";
import FoundersWall from "@/components/FoundersWall";
import Hero from "@/components/Hero";
import HomeSections from "@/components/HomeSections";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <Navbar />
      <Hero />
      <HomeSections />
      <FoundersWall />
      <Footer />
    </main>
  );
}
