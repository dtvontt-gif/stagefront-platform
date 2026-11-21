import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveDirectory from "@/components/LiveDirectory";

export const metadata: Metadata = {
  title: "StageFront Live Rooms",
  description: "Choose Untamed Vibez Live or The Jungle on StageFront.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LivePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#070708] pt-20">
        <LiveDirectory />
      </main>
      <Footer />
    </>
  );
}
