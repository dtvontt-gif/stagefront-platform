import { requirePermission, serviceConfiguration } from "@/lib/stagefront-auth";
import {
  deleteProfileImage,
  profileImageUrl,
  uploadProfileImage,
  validateProfileImage,
} from "@/lib/profile-images";

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function validTikTokUrl(value: unknown) {
  if (value === "" || value === null) return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)tiktok\.com$/i.test(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function GET() {
  const admin = await requirePermission("hosts");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const query = new URLSearchParams({
    select:
      "founder_number,display_name,username,email,tiktok_profile_url,tiktok_live_url,is_live,host_published,profile_image_path",
    role: "eq.host",
    order: "founder_number.asc",
  });
  const response = await fetch(`${config.url}/rest/v1/founding_members?${query}`, {
    headers: serviceHeaders(config.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ message: "Unable to load hosts." }, { status: 502 });
  const rows = (await response.json()) as Record<string, unknown>[];
  return Response.json({
    hosts: rows.map((row) => ({
      ...row,
      profile_image_url: profileImageUrl(config.url, row.profile_image_path as string | null),
    })),
  });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission("hosts");
  const config = serviceConfiguration();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!config) return Response.json({ message: "Admin service is not configured." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const founderNumber = Number(form?.get("founder_number"));
  const profileUrl = validTikTokUrl(form?.get("tiktok_profile_url"));
  const liveUrl = validTikTokUrl(form?.get("tiktok_live_url"));
  const isLive = form?.get("is_live") === "true";
  const hostPublished = form?.get("host_published") === "true";
  const previewImageValue = form?.get("preview_image");
  const previewImage = previewImageValue instanceof File && previewImageValue.size > 0 ? previewImageValue : null;
  const imageError = validateProfileImage(previewImage);
  if (
    !Number.isSafeInteger(founderNumber) ||
    profileUrl === undefined ||
    liveUrl === undefined ||
    imageError
  ) {
    return Response.json(
      { message: imageError ?? "Enter valid TikTok links beginning with https://." },
      { status: 400 },
    );
  }

  const lookup = await fetch(
    `${config.url}/rest/v1/founding_members?select=profile_image_path&founder_number=eq.${founderNumber}&role=eq.host&limit=1`,
    { headers: serviceHeaders(config.serviceKey), cache: "no-store" },
  );
  const [existing] = lookup.ok
    ? ((await lookup.json()) as { profile_image_path?: string | null }[])
    : [];
  if (!existing) return Response.json({ message: "Host not found." }, { status: 404 });

  let newImagePath: string | null = null;
  if (previewImage) {
    try {
      newImagePath = await uploadProfileImage(config, `hosts/${founderNumber}`, previewImage);
    } catch {
      return Response.json({ message: "The preview image could not be uploaded." }, { status: 502 });
    }
  }

  const response = await fetch(
    `${config.url}/rest/v1/founding_members?founder_number=eq.${founderNumber}&role=eq.host`,
    {
      method: "PATCH",
      headers: { ...serviceHeaders(config.serviceKey), Prefer: "return=representation" },
      body: JSON.stringify({
        tiktok_profile_url: profileUrl,
        tiktok_live_url: liveUrl,
        is_live: isLive,
        host_published: hostPublished,
        ...(newImagePath
          ? { profile_image_path: newImagePath, profile_image_updated_at: new Date().toISOString() }
          : {}),
      }),
    },
  );
  if (!response.ok) {
    if (newImagePath) await deleteProfileImage(config, newImagePath);
    return Response.json({ message: "Host settings could not be saved." }, { status: 502 });
  }
  const changed = (await response.json()) as unknown[];
  if (!changed.length) return Response.json({ message: "Host not found." }, { status: 404 });
  if (newImagePath && existing.profile_image_path) {
    await deleteProfileImage(config, existing.profile_image_path);
  }
  return Response.json({
    message: newImagePath
      ? "Host settings and live preview saved."
      : "Host profile and live status saved.",
  });
}
