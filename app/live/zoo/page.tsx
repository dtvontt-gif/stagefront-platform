import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveHouse from "@/components/LiveHouse";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Untamed Vibez Live House | StageFront",
  description: "The official live room for Untamed Vibez on StageFront.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ZooLivePage() {
  if (process.env.NEXT_PUBLIC_RETIRED_LIVE_ROOM_ENABLED !== "true") {
    redirect("/jungle");
  }
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
