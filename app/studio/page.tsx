import { redirect } from "next/navigation";
import ProjectUploader from "@/components/karaoke-v2/ProjectUploader";
import { karaokeSession } from "@/lib/karaoke-v2/auth";

export default async function StudioPage() {
  const session = await karaokeSession();
  if (!session) redirect("/sign-in");
  return <main className="studio"><ProjectUploader email={session.user.email || "Signed in"} /></main>;
}
