import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveHouse from "@/components/LiveHouse";

export const metadata: Metadata = {
  title: "Zoo Crew Live House | StageFront",
  description: "The official live room for Zoo Crew Vibe on StageFront.",
};

export default function LivePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#070708] pt-20">
        <LiveHouse />
      </main>
      <Footer />
    </>
  );
}
