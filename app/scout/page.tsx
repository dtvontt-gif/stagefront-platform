import { redirect } from "next/navigation";
import { connection } from "next/server";
import LiveScout from "@/components/LiveScout";
import { staffAccess } from "@/lib/stagefront-auth";

export default async function ScoutPage() {
  await connection();
  const access = await staffAccess();
  if (!access) redirect("/sign-in?next=/scout");
  if (!access.permissions.includes("hosts")) redirect("/admin");
  return <LiveScout />;
}
