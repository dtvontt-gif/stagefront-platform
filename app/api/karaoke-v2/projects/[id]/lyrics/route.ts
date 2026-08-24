import { NextResponse } from "next/server";
import { karaokeSession } from "@/lib/karaoke-v2/auth";
import { supabaseForUser } from "@/lib/karaoke-v2/supabase";

type EditableToken = { id: string; text: string; startMs: number; endMs: number; confidence?: number };
type EditableLine = { id: string; text: string; startMs: number; endMs: number; tokens: EditableToken[] };

function validLines(value: unknown): value is EditableLine[] {
  if (!Array.isArray(value) || value.length > 5000) return false;
  let previousLineStart = -1;
  return value.every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as EditableLine;
    if (typeof item.id !== "string" || typeof item.text !== "string" || item.text.length > 1000 ||
      !Number.isSafeInteger(item.startMs) || !Number.isSafeInteger(item.endMs) || item.startMs < 0 || item.endMs <= item.startMs ||
      item.startMs < previousLineStart || !Array.isArray(item.tokens) || item.tokens.length > 300) return false;
    previousLineStart = item.startMs;
    let previousTokenEnd = item.startMs;
    return item.tokens.every((token) => {
      const valid = typeof token.id === "string" && typeof token.text === "string" && token.text.length <= 200 &&
        Number.isSafeInteger(token.startMs) && Number.isSafeInteger(token.endMs) && token.startMs >= previousTokenEnd &&
        token.endMs > token.startMs && token.startMs >= item.startMs && token.endMs <= item.endMs;
      previousTokenEnd = token.endMs;
      return valid;
    });
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabaseForUser(session.accessToken).from("karaoke_v2_project_revisions")
    .select("revision,project_data,created_at").eq("project_id", id).order("revision", { ascending: false }).limit(1).single();
  if (error || !data) return NextResponse.json({ error: "Timed lyrics not found." }, { status: 404 });
  return NextResponse.json({ revision: data.revision, project: data.project_data, savedAt: data.created_at });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await karaokeSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (!validLines(body.lines)) return NextResponse.json({ error: "Some lyric text or timing is invalid." }, { status: 400 });
  const offsetMs = Number(body.offsetMs ?? 0);
  if (!Number.isSafeInteger(offsetMs) || Math.abs(offsetMs) > 300000) {
    return NextResponse.json({ error: "The lyric offset is invalid." }, { status: 400 });
  }

  const client = supabaseForUser(session.accessToken);
  const { data: current, error: currentError } = await client.from("karaoke_v2_project_revisions")
    .select("revision,project_data").eq("project_id", id).order("revision", { ascending: false }).limit(1).single();
  if (currentError || !current) return NextResponse.json({ error: "Project revision not found." }, { status: 404 });
  if (Number(body.baseRevision) !== current.revision) {
    return NextResponse.json({ error: "A newer revision exists. Reload the editor before saving." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const revision = current.revision + 1;
  const projectData = {
    ...(current.project_data as Record<string, unknown>),
    status: "ready",
    updatedAt: now,
    revision,
    lyrics: { offsetMs, lines: body.lines },
  };
  const { error: insertError } = await client.from("karaoke_v2_project_revisions").insert({
    project_id: id, owner_id: session.user.id, revision, project_data: projectData,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await client.from("karaoke_v2_projects").update({ updated_at: now }).eq("id", id);
  return NextResponse.json({ saved: true, revision, savedAt: now });
}
