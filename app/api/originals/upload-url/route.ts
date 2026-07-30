import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

const BUCKET = "stagefront-original-music";
const MAX_BYTES = 50 * 1024 * 1024;
const extensions: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
};

export async function POST(request: Request) {
  const [user, config] = await Promise.all([authenticatedUser(), Promise.resolve(serviceConfiguration())]);
  if (!user?.email) return Response.json({ message: "Sign in before uploading your song." }, { status: 401 });
  if (!config) return Response.json({ message: "Original music storage is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { type?: unknown; size?: unknown } | null;
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const extension = extensions[type];
  if (!extension || !Number.isFinite(size) || size < 1 || size > MAX_BYTES) {
    return Response.json({ message: "Use an MP3, M4A, WAV, or AAC file no larger than 50 MB." }, { status: 400 });
  }
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(
    `${config.url}/storage/v1/object/upload/sign/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ upsert: false }),
    },
  );
  if (!response.ok) return Response.json({ message: "The secure upload could not be prepared." }, { status: 502 });
  const signed = (await response.json()) as { url?: string; signedURL?: string; token?: string };
  const relative = signed.url ?? signed.signedURL;
  if (!relative) return Response.json({ message: "The upload service returned an invalid address." }, { status: 502 });
  const uploadUrl = relative.startsWith("http") ? relative : `${config.url}/storage/v1${relative}`;
  const publicUrl = `${config.url}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return Response.json({ uploadUrl, path, publicUrl, token: signed.token ?? null });
}

