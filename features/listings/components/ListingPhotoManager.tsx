"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createExternalPhotoAsset,
  dedupePhotoAssets,
  deleteListingPhoto,
  MAX_LISTING_PHOTO_UPLOAD_BYTES,
  type ListingPhotoAsset,
  uploadListingPhoto,
} from "@/lib/listings/media";

type ListingPhotoManagerProps = {
  title: string;
  helperText: string;
  photos: ListingPhotoAsset[];
  onChange: (photos: ListingPhotoAsset[]) => void;
  scope: "listing" | "inventory";
  minimumCount?: number;
};

export default function ListingPhotoManager({
  title,
  helperText,
  photos,
  onChange,
  scope,
  minimumCount = 3,
}: ListingPhotoManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setMessage("");
    setIsUploading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in to upload photos.");

      const uploaded: ListingPhotoAsset[] = [];
      for (const file of files) {
        const asset = await uploadListingPhoto({ supabase, file, userId: user.id, scope });
        uploaded.push(asset);
      }

      onChange(dedupePhotoAssets([...photos, ...uploaded]));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleAddUrl() {
    const normalized = urlDraft.trim();
    if (!normalized) return;
    onChange(dedupePhotoAssets([...photos, createExternalPhotoAsset(normalized)]));
    setUrlDraft("");
  }

  async function handleRemovePhoto(photo: ListingPhotoAsset) {
    setMessage("");
    setRemovingUrl(photo.url);
    try {
      await deleteListingPhoto({ supabase, storagePath: photo.storagePath });
      onChange(photos.filter((item) => item.url !== photo.url));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove photo.");
    } finally {
      setRemovingUrl(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-zinc-600">{helperText}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${photos.length >= minimumCount ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {photos.length}/{minimumCount} photos
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {isUploading ? "Uploading..." : "Upload photos"}
        </button>
        <p className="self-center text-xs text-zinc-500">PNG / JPG / WebP up to {(MAX_LISTING_PHOTO_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB each.</p>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          placeholder="Or paste a hosted image URL"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
        />
        <button className="rounded-xl border border-zinc-300 px-4 py-2 text-sm" onClick={handleAddUrl} type="button">
          Add URL
        </button>
      </div>

      {photos.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((photo) => (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200" key={photo.url}>
              <img alt={title} className="h-32 w-full object-cover" src={photo.url} />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] text-zinc-700">
                  {photo.storagePath ? "Uploaded" : "Linked"}
                </span>
                <button
                  className="rounded-full bg-white/90 px-2 py-1 text-xs"
                  disabled={removingUrl === photo.url}
                  onClick={() => handleRemovePhoto(photo)}
                  type="button"
                >
                  {removingUrl === photo.url ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
          Add resort or unit photos so the listing feels complete to travelers.
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}
