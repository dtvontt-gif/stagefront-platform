import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveDirectory from "@/components/LiveDirectory";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "The Jungle Live Room | StageFront",
  description: "Enter The Jungle, the main Untamed Vibez live room on StageFront.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LivePage() {
  if (process.env.NEXT_PUBLIC_RETIRED_LIVE_ROOM_ENABLED !== "true") {
    redirect("/jungle");
  }
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
