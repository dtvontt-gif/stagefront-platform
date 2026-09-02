import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const client = supabaseForUser(session.accessToken);
  const [{ data: job }, { data: render }] = await Promise.all([
    client.from("karaoke_v2_jobs").select("id,status,progress,error,updated_at").eq("project_id", id).eq("kind", "render").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("karaoke_v2_assets").select("id,size_bytes,created_at").eq("project_id", id).eq("kind", "render").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return NextResponse.json({ job, render });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const client = supabaseForUser(session.accessToken);
  const [{ data: project }, { data: instrumental }, { data: active }] = await Promise.all([
    client.from("karaoke_v2_projects").select("id").eq("id", id).single(),
    client.from("karaoke_v2_assets").select("id").eq("project_id", id).eq("kind", "instrumental").limit(1).maybeSingle(),
    client.from("karaoke_v2_jobs").select("id,status,progress").eq("project_id", id).eq("kind", "render").in("status", ["queued", "running"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!instrumental) return NextResponse.json({ error: "The instrumental is not ready yet." }, { status: 409 });
  if (active) return NextResponse.json({ job: active, alreadyQueued: true });
  const { data: job, error } = await client.from("karaoke_v2_jobs").insert({
    project_id: id, owner_id: session.user.id, kind: "render", status: "queued", progress: 0,
  }).select("id,status,progress").single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Could not queue the video." }, { status: 500 });
  return NextResponse.json({ job }, { status: 201 });
}
