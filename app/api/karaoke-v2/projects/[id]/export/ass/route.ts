import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { karaokeAss, karaokeExportName } from "@/lib/karaoke-v2/ass";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabaseForUser(session.accessToken).from("karaoke_v2_project_revisions")
    .select("project_data").eq("project_id", id).order("revision", { ascending: false }).limit(1).single();
  if (error || !data) return NextResponse.json({ error: "Saved karaoke project not found." }, { status: 404 });
  const project = data.project_data as Parameters<typeof karaokeAss>[0];
  return new NextResponse(karaokeAss(project), {
    headers: {
      "Content-Type": "text/x-ssa; charset=utf-8",
      "Content-Disposition": `attachment; filename="${karaokeExportName(project)}"`,
      "Cache-Control": "no-store",
    },
  });
}
