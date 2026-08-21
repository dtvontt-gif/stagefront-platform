import { redirect } from "next/navigation";
import SignInForm from "@/components/karaoke-v2/SignInForm";
import { karaokeSession } from "@/lib/karaoke-v2/auth";

export default async function SignInPage() {
  if (await karaokeSession()) redirect("/studio");
  return <main><p className="eyebrow">StageFront Karaoke v2</p><h1>Sign in</h1><p className="lede">Use your existing StageFront account.</p><SignInForm /></main>;
}
