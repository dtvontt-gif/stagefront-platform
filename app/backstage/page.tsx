import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { authenticatedUser, staffAccess } from "@/lib/stagefront-auth";

export const metadata: Metadata = {
  title: "Backstage Pass | StageFront",
  description: "Secure StageFront staff entrance.",
  robots: { index: false, follow: false },
};

export default async function BackstagePage() {
  const [user, staff] = await Promise.all([authenticatedUser(), staffAccess()]);
  if (!user) redirect("/sign-in?next=/backstage");
  if (staff) redirect("/admin");

  return (
    <main className="min-h-screen bg-[#070708] pt-20 text-white">
      <Navbar />
      <section className="flex min-h-[70vh] items-center px-5 py-20 sm:px-8">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[#f4b400]/20 bg-white/[0.035] p-8 text-center sm:p-12">
          <p className="section-kicker">Backstage Pass</p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase sm:text-6xl">
            Staff access <span className="text-stage-gold">only.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg leading-8 text-white/60">
            You are signed in, but this account has not been approved for the
            StageFront backstage area. Contact the StageFront owner if you
            believe you should have staff access.
          </p>
          <a href="/" className="primary-cta mt-8">Return to StageFront</a>
        </div>
      </section>
      <Footer />
    </main>
  );
}

