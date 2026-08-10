import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import SocialProfileEditor from "@/components/SocialProfileEditor";

export const metadata: Metadata = {
  title: "My Profile | StageFront",
  description: "Manage your StageFront member profile and stage portrait.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#070708] px-5 pb-24 pt-32 text-white sm:px-8">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <p className="section-kicker">Your StageFront identity</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">My <span className="text-stage-gold">profile.</span></h1>
        <p className="mb-12 mt-5 max-w-2xl text-white/55">Upload your portrait and StageFront will place you inside the signature stage frame with your permanent member number.</p>
        <Suspense fallback={<p className="text-white/60">Loading your profile...</p>}>
          <SocialProfileEditor />
        </Suspense>
      </div>
    </main>
  );
}
