import { redirect } from "next/navigation";
import ProjectUploader from "@/components/karaoke-v2/ProjectUploader";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseConfiguration } from "@/lib/karaoke-v2/supabase";

export default async function StudioPage() {
  const session = await karaokeSession();
  if (!session) redirect("/sign-in");
  const config = supabaseConfiguration();
  return <main className="studio"><ProjectUploader
    email={session.user.email || "Signed in"}
    supabaseUrl={config.url}
    supabaseAnonKey={config.anonKey}
  /></main>;
}
