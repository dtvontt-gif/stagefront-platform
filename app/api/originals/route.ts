import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET() {
  const config = serviceConfiguration();
  if (!config) return Response.json({ songs: [] });
  const query = new URLSearchParams({
    select: "id,artist_name,song_title,genre,artist_bio,story,audio_url,featured,created_at",
    status: "eq.approved",
    order: "featured.desc,created_at.desc",
  });
  const response = await fetch(`${config.url}/rest/v1/original_artist_submissions?${query}`, {
    headers: headers(config.serviceKey),
    cache: "no-store",
  });
  return response.ok ? Response.json({ songs: await response.json() }) : Response.json({ songs: [] });
}

export async function POST(request: Request) {
  const [user, config] = await Promise.all([authenticatedUser(), Promise.resolve(serviceConfiguration())]);
  if (!user?.email) return Response.json({ message: "Sign in before submitting original music." }, { status: 401 });
  if (!config) return Response.json({ message: "Original Artist Showcase is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const artistName = clean(body?.artistName, 80);
  const songTitle = clean(body?.songTitle, 120);
  const genre = clean(body?.genre, 80);
  const artistBio = clean(body?.artistBio, 600);
  const story = clean(body?.story, 2000);
  const audioPath = clean(body?.audioPath, 300);
  const audioUrl = clean(body?.audioUrl, 1000);
  if (
    artistName.length < 2 ||
    !songTitle ||
    story.length < 20 ||
    !audioPath.startsWith(`${user.id}/`) ||
    !audioUrl.startsWith(`${config.url}/storage/v1/object/public/stagefront-original-music/`)
  ) return Response.json({ message: "Complete the artist, song, and story information." }, { status: 400 });
  const response = await fetch(`${config.url}/rest/v1/original_artist_submissions`, {
    method: "POST",
    headers: { ...headers(config.serviceKey), Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: user.id,
      email: user.email.toLowerCase(),
      artist_name: artistName,
      song_title: songTitle,
      genre,
      artist_bio: artistBio,
      story,
      audio_path: audioPath,
      audio_url: audioUrl,
    }),
  });
  return response.ok
    ? Response.json({ message: "Your song was submitted for StageFront review." })
    : Response.json({ message: "Your submission could not be saved." }, { status: 502 });
}

