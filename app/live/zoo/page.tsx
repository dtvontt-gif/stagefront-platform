import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveHouse from "@/components/LiveHouse";

export const metadata: Metadata = {
  title: "Zoo Crew Live House | StageFront",
  description: "The official live room for Zoo Crew Vibe on StageFront.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ZooLivePage() {
  const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA || "development";
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#070708] pt-20">
        <LiveHouse buildVersion={buildVersion} experience="zoo" />
      </main>
      <Footer />
    </>
  );
}
