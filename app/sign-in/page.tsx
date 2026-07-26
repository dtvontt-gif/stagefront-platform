import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AccountForm from "@/components/AccountForm";

export const metadata: Metadata = {
  title: "Sign In | StageFront",
  description: "Sign in to your StageFront member account.",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070708] px-5 py-28 text-center text-white">
      <Navbar />
      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_420px] lg:text-left">
        <div>
          <p className="section-kicker">Member accounts</p>
          <h1 className="mt-5 font-display text-5xl font-black uppercase sm:text-7xl">
            Your place on
            <span className="block text-stage-gold">the StageFront.</span>
          </h1>
          <p className="mt-7 text-base leading-8 text-white/60">
            Sign in to manage your StageFront account. New members can create an
            account using the same email used for Founding Member registration.
          </p>
        </div>
        <AccountForm />
      </div>
    </main>
  );
}
