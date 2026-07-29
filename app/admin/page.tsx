import { redirect } from "next/navigation";
import AdminFounders from "@/components/AdminFounders";
import AdminGoldenVoices from "@/components/AdminGoldenVoices";
import AdminHosts from "@/components/AdminHosts";
import AdminQueue from "@/components/AdminQueue";
import AdminStaff from "@/components/AdminStaff";
import AdminAudioStation from "@/components/AdminAudioStation";
import AdminWinners from "@/components/AdminWinners";
import { staffAccess } from "@/lib/stagefront-auth";

export const metadata = {
  title: "Administrator | StageFront",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const access = await staffAccess();
  if (!access) redirect("/sign-in");

  return (
    <main className="min-h-screen bg-[#070708] px-5 py-16 text-white sm:px-8">
      <div className="mx-auto mb-10 flex max-w-6xl items-center justify-between">
        <a href="/" className="font-display text-2xl font-black tracking-wider text-[#f4b400]">
          STAGEFRONT
        </a>
        <div className="flex items-center gap-5">
          <a href="/profile?member=1" className="text-sm font-semibold text-[#f4b400] hover:text-[#ffd05a]">
            My profile
          </a>
        <form action="/api/auth/sign-out" method="post">
          <button type="submit" className="text-sm font-semibold text-white/60 hover:text-white">
            Sign out
          </button>
        </form>
        </div>
      </div>
      <div className="mx-auto mb-12 max-w-6xl rounded-2xl border border-[#f4b400]/20 bg-[#f4b400]/[0.05] px-5 py-4 text-sm text-white/65">
        Signed in with <strong className="capitalize text-[#f4b400]">{access.role}</strong> access.
      </div>
      {access.permissions.includes("profiles") ? <><AdminFounders /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("hosts") ? <><AdminHosts /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("hosts") ? <><AdminAudioStation /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("queue") ? <><AdminQueue /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("contests") ? <><AdminGoldenVoices /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("contests") ? <><AdminWinners /><div className="mx-auto my-16 h-px max-w-6xl bg-white/10" /></> : null}
      {access.permissions.includes("staff") ? <AdminStaff /> : null}
    </main>
  );
}
