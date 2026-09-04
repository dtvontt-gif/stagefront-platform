import { redirect } from "next/navigation";
import ProjectUploader from "@/components/karaoke-v2/ProjectUploader";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseConfiguration } from "@/lib/karaoke-v2/supabase";
import "./karaoke.css";

export default async function StudioPage() {
  const session = await karaokeSession();
  if (!session) redirect("/sign-in?next=/studio");
  const config = supabaseConfiguration();
  return <main className="studio"><a className="button-link music-studio-link" href="/music-studio">Open Music Generator</a><ProjectUploader
    email={session.user.email || "Signed in"}
    supabaseUrl={config.url}
    supabaseAnonKey={config.anonKey}
  /></main>;
}
