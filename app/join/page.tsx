import type { Metadata } from "next";
import Image from "next/image";
import FoundingMemberForm from "@/components/FoundingMemberForm";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Become a Founding Member | StageFront",
  description:
    "Join the first 1,000 StageFront members, reserve your username, and help build the next great live entertainment community.",
};

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <section className="relative overflow-hidden px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <div className="absolute left-1/2 top-0 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#f4b400]/10 blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <Image
              src="/images/icons/stagefront-profile-icon.png"
              alt="StageFront Founding Member badge"
              width={180}
              height={180}
              className="h-28 w-28 sm:h-36 sm:w-36"
              priority
            />
            <p className="section-kicker mt-8">The first 1,000</p>
            <h1 className="section-title text-4xl sm:text-6xl">
              Reserve your place
              <span className="block text-stage-gold">in StageFront history.</span>
            </h1>
            <p className="section-lede">
              Choose your role, reserve your username, and become part of the
              founding generation before the full platform launches.
            </p>
          </div>

          <FoundingMemberForm />
        </div>
      </section>
    </main>
  );
}
