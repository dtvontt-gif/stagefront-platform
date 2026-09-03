import { redirect } from "next/navigation";
import MusicGenerator from "@/components/music/MusicGenerator";
import { karaokeSession } from "@/lib/karaoke-v2/auth";

export default async function MusicStudioPage() {
  const session = await karaokeSession();
  if (!session) redirect("/sign-in");
  return <main className="studio"><MusicGenerator email={session.user.email || "Signed in"} configured={Boolean(process.env.ELEVENLABS_API_KEY)} /></main>;
}
