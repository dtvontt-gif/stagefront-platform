import type { Metadata } from "next";
import Footer from "@/components/Footer";
import FoundersWall from "@/components/FoundersWall";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Wall of Founders | StageFront",
  description: "The permanent StageFront record honoring the first members who believed every artist deserved a stage.",
};

export default function FoundersPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] pt-20 text-white">
      <Navbar />
      <FoundersWall />
      <Footer />
    </main>
  );
}

