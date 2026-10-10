import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveHouse from "@/components/LiveHouse";

export const metadata: Metadata = {
  title: "The Jungle Live Room | StageFront",
  description: "Enter The Jungle, StageFront's vine-covered live room.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function JunglePage() {
  const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA || "development";
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#020805] pt-20">
        <LiveHouse buildVersion={buildVersion} experience="jungle" />
      </main>
      <Footer />
    </>
  );
}
