export const PROFILE_BUCKET = "stagefront-profile-images";
export const PROFILE_MAX_BYTES = 5 * 1024 * 1024;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateProfileImage(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = extensions[file.type];
  if (!extension) return "Use a JPG, PNG, or WebP image.";
  if (file.size > PROFILE_MAX_BYTES) return "Profile photos must be 5 MB or smaller.";
  return null;
}

export function profileImageUrl(supabaseUrl: string, path?: string | null) {
  if (!path) return null;
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PROFILE_BUCKET}/${safePath}`;
}

export async function uploadProfileImage(
  config: { url: string; serviceKey: string },
  founderNumber: number,
  file: File,
) {
  const extension = extensions[file.type];
  if (!extension) throw new Error("Unsupported image type.");
  const path = `${founderNumber}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(
    `${config.url}/storage/v1/object/${PROFILE_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
    },
  );
  if (!response.ok) throw new Error(await response.text());
  return path;
}

export async function uploadWinnerImage(
  config: { url: string; serviceKey: string },
  file: File,
) {
  const extension = extensions[file.type];
  if (!extension) throw new Error("Unsupported image type.");
  const path = `winners/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(
    `${config.url}/storage/v1/object/${PROFILE_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
    },
  );
  if (!response.ok) throw new Error(await response.text());
  return {
    path,
    url: profileImageUrl(config.url, path),
  };
}

export async function deleteProfileImage(
  config: { url: string; serviceKey: string },
  path?: string | null,
) {
  if (!path) return;
  await fetch(`${config.url}/storage/v1/object/${PROFILE_BUCKET}/${path}`, {
    method: "DELETE",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
    },
  });
}
