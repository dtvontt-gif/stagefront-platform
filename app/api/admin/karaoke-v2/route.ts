import { requirePermission } from "@/lib/stagefront-auth";
import { supabaseService } from "@/lib/karaoke-v2/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePermission("queue");
  if (!access) return Response.json({ error: "Administrator access required." }, { status: 403 });

  const client = supabaseService();
  const [{ data: projects, error: projectError }, { data: jobs, error: jobError }, { data: users, error: userError }] = await Promise.all([
    client.from("karaoke_v2_projects").select("id,owner_id,title,artist,status,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
    client.from("karaoke_v2_jobs").select("id,project_id,owner_id,kind,status,progress,error,attempts,created_at,updated_at").order("created_at", { ascending: false }).limit(300),
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (projectError || jobError || userError) return Response.json({ error: projectError?.message || jobError?.message || userError?.message || "Could not load engine activity." }, { status: 500 });

  const emailById = new Map(users.users.map((user) => [user.id, user.email || "Unknown user"]));
  const latestJobByProject = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) if (!latestJobByProject.has(job.project_id)) latestJobByProject.set(job.project_id, job);
  const counts = { total: projects.length, queued: 0, running: 0, failed: 0, succeeded: 0 };
  for (const job of jobs) {
    if (job.status === "queued") counts.queued += 1;
    if (job.status === "running") counts.running += 1;
    if (job.status === "failed") counts.failed += 1;
    if (job.status === "succeeded") counts.succeeded += 1;
  }

  return Response.json({ counts, projects: projects.map((project) => ({ ...project, owner_email: emailById.get(project.owner_id) || "Unknown user", latest_job: latestJobByProject.get(project.id) || null })) });
}
