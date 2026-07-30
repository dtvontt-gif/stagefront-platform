import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OriginalArtistSubmission from "@/components/OriginalArtistSubmission";
import { authenticatedUser } from "@/lib/stagefront-auth";

export const metadata: Metadata = {
  title: "Submit Original Music | StageFront",
  description: "Share your original song and tell StageFront the story behind the music.",
};

export default async function SubmitOriginalPage() {
  const user = await authenticatedUser();
  if (!user) redirect("/sign-in?next=/originals/submit");
  return (
    <main className="min-h-screen bg-[#070708] pt-20 text-white">
      <Navbar />
      <section className="original-submit-section">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Your sound. Your story.</p>
            <h1>Tell us why your music <span className="text-stage-gold">should be heard.</span></h1>
            <p>StageFront Originals is about more than pressing play. Give listeners a reason to understand the person, moment, and purpose behind your song.</p>
            <div className="original-review-note">
              <strong>Every submission is reviewed.</strong>
              <span>Approved music appears publicly. StageFront does not claim ownership of your song.</span>
            </div>
          </div>
          <OriginalArtistSubmission />
        </div>
      </section>
      <Footer />
    </main>
  );
}

