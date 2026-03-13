import type { SupabaseClient } from "@supabase/supabase-js";

export const LISTING_MEDIA_BUCKET = "listing-media";
export const MAX_LISTING_PHOTO_UPLOAD_BYTES = 8 * 1024 * 1024;

export type ListingPhotoAsset = {
  url: string;
  storagePath: string | null;
};

export function createExternalPhotoAsset(url: string): ListingPhotoAsset {
  return {
    url: url.trim(),
    storagePath: null,
  };
}

export function dedupePhotoAssets(assets: ListingPhotoAsset[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const normalizedUrl = asset.url.trim();
    const key = `${asset.storagePath ?? "external"}::${normalizedUrl}`;
    if (!normalizedUrl || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function serializePhotoAssets(assets: ListingPhotoAsset[]) {
  const normalized = dedupePhotoAssets(assets);
  return {
    photoUrls: normalized.map((asset) => asset.url),
    photoStoragePaths: normalized.flatMap((asset) => (asset.storagePath ? [asset.storagePath] : [])),
  };
}

export async function uploadListingPhoto({
  supabase,
  file,
  userId,
  scope,
}: {
  supabase: SupabaseClient;
  file: File;
  userId: string;
  scope: "listing" | "inventory";
}) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  if (file.size > MAX_LISTING_PHOTO_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than 8 MB.`);
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
  const fileName = `${scope}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storagePath = `${userId}/${scope}/${fileName}`;

  const { error } = await supabase.storage.from(LISTING_MEDIA_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(LISTING_MEDIA_BUCKET).getPublicUrl(storagePath);

  return {
    url: publicUrl,
    storagePath,
  } satisfies ListingPhotoAsset;
}

export async function deleteListingPhoto({
  supabase,
  storagePath,
}: {
  supabase: SupabaseClient;
  storagePath: string | null;
}) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(LISTING_MEDIA_BUCKET).remove([storagePath]);
  if (error) throw error;
}
