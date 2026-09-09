import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProfileEditor from "@/components/ProfileEditor";
import SocialProfileEditor from "@/components/SocialProfileEditor";
import { requirePermission } from "@/lib/stagefront-auth";

export const metadata: Metadata = {
  title: "My Profile | StageFront",
  description: "Manage your StageFront member profile and stage portrait.",
};

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const query = await searchParams;
  const managedMember = typeof query.member === "string" ? query.member : null;
  if (managedMember && !(await requirePermission("profiles"))) redirect("/backstage");

  return (
    <main className="min-h-screen bg-[#070708] px-5 pb-24 pt-32 text-white sm:px-8">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <p className="section-kicker">{managedMember ? "Backstage profile manager" : "Your StageFront identity"}</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">{managedMember ? "Manage" : "My"} <span className="text-stage-gold">profile.</span></h1>
        <p className="mb-12 mt-5 max-w-2xl text-white/55">{managedMember ? "Update this member, change their role, or promote them into Host Discovery." : "Upload your portrait and build your StageFront member profile."}</p>
        <Suspense fallback={<p className="text-white/60">Loading your profile...</p>}>
          {managedMember ? <ProfileEditor /> : <SocialProfileEditor />}
        </Suspense>
      </div>
    </main>
  );
}
