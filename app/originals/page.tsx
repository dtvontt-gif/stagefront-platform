import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OriginalsShowcase from "@/components/OriginalsShowcase";

export const metadata: Metadata = {
  title: "Original Artist Showcase | StageFront",
  description: "Hear independent original music and discover the stories behind the songs.",
};

export default function OriginalsPage() {
  return (
    <main className="min-h-screen bg-[#070708] pt-20 text-white">
      <Navbar />
      <OriginalsShowcase />
      <Footer />
    </main>
  );
}

