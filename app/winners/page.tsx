import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import WinnersSpotlight from "@/components/WinnersSpotlight";

export const metadata: Metadata = {
  title: "Contest Winners | StageFront",
  description: "Meet StageFront Box Battle and Golden Voices champions and watch their featured performances.",
};

export default function WinnersPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] pt-20 text-white">
      <Navbar />
      <WinnersSpotlight />
      <Footer />
    </main>
  );
}

