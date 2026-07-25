import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Sign In | StageFront",
  description: "StageFront member sign-in is coming soon.",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070708] px-5 pt-20 text-center text-white">
      <Navbar />
      <div className="max-w-xl">
        <p className="section-kicker">Member accounts</p>
        <h1 className="mt-5 font-display text-5xl font-black uppercase sm:text-7xl">
          Sign in is
          <span className="block text-stage-gold">coming next.</span>
        </h1>
        <p className="mt-7 text-base leading-8 text-white/60">
          Founding Member registration is open now. Full accounts and profiles
          will be activated in the next StageFront release.
        </p>
        <a href="/join" className="primary-cta mt-9">
          Become a Founding Member
        </a>
      </div>
    </main>
  );
}
