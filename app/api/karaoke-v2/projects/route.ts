import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

export async function GET() {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const client = supabaseForUser(session.accessToken);
  const [{ data: projects, error }, { data: jobs, error: jobsError }] = await Promise.all([
    client.from("karaoke_v2_projects").select("id,title,artist,status,created_at,updated_at").order("created_at", { ascending: false }),
    client.from("karaoke_v2_jobs").select("id,project_id,kind,status,progress,error,created_at,updated_at").order("created_at", { ascending: false }),
  ]);
  if (error || jobsError) return NextResponse.json({ error: error?.message || jobsError?.message }, { status: 500 });
  return NextResponse.json({ projects, jobs });
}

export async function POST(request: Request) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const artist = String(body.artist || "").trim();
  if (!title || title.length > 160) return NextResponse.json({ error: "Enter a title under 160 characters." }, { status: 400 });
  if (artist.length > 160) return NextResponse.json({ error: "Keep the artist under 160 characters." }, { status: 400 });

  const { data, error } = await supabaseForUser(session.accessToken)
    .rpc("karaoke_v2_create_project", { project_title: title, project_artist: artist || null })
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
