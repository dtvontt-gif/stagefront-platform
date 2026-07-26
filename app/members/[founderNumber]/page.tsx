import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import StagePortrait from "@/components/StagePortrait";
import { serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

type Props = { params: Promise<{ founderNumber: string }> };

export const metadata: Metadata = { title: "Member Profile | StageFront" };

export default async function MemberPage({ params }: Props) {
  const { founderNumber: value } = await params;
  const founderNumber = Number(value);
  const config = serviceConfiguration();
  if (!config || !Number.isSafeInteger(founderNumber)) notFound();
  const query = new URLSearchParams({
    select: "founder_number,display_name,username,role,profile_image_path",
    founder_number: `eq.${founderNumber}`,
    limit: "1",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) notFound();
  const [member] = (await response.json()) as {
    founder_number: number; display_name: string; username: string; role: string; profile_image_path?: string | null;
  }[];
  if (!member) notFound();

  return (
    <main className="min-h-screen bg-[#070708] px-5 pb-24 pt-32 text-white sm:px-8">
      <Navbar />
      <div className="mx-auto grid max-w-4xl items-center gap-12 lg:grid-cols-[320px_1fr]">
        <StagePortrait imageUrl={profileImageUrl(config.url, member.profile_image_path)} memberNumber={member.founder_number} name={member.display_name} />
        <div>
          <p className="section-kicker">StageFront Member #{String(member.founder_number).padStart(4, "0")}</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">{member.display_name}</h1>
          <p className="mt-4 text-xl capitalize text-white/55">@{member.username} · {member.role}</p>
          <a href="/profile" className="secondary-cta mt-8">Edit my profile</a>
        </div>
      </div>
    </main>
  );
}
