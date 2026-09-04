const WORKER_DISPATCH_URL = "https://api.github.com/repos/dtvontt-gif/stagefront-karaoke-worker-v2/actions/workflows/separate.yml/dispatches";

export async function wakeKaraokeWorker() {
  const token = process.env.GITHUB_KARAOKE_WORKER_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch(WORKER_DISPATCH_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
      cache: "no-store",
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
