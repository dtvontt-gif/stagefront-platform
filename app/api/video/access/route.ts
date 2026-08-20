import { authenticatedUser } from "@/lib/stagefront-auth";
import { ownerHasFreeVideoAccess, videoCreditBalance, VIDEO_PACKS } from "@/lib/video-credits";

export async function GET() {
  const user = await authenticatedUser();
  const packs = Object.entries(VIDEO_PACKS).map(([id, pack]) => ({ id, ...pack }));
  if (!user?.email) return Response.json({ signedIn: false, owner: false, credits: 0, packs });
  const owner = ownerHasFreeVideoAccess(user.email);
  try {
    const credits = owner ? null : await videoCreditBalance(user.id);
    return Response.json({ signedIn: true, owner, credits, packs });
  } catch (error) {
    console.error("Video access check failed", error);
    return Response.json({ error: "Video credits are temporarily unavailable." }, { status: 503 });
  }
}
