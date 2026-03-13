"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OWNER_LISTING_DRAFT_KEY } from "@/lib/listings/draft";

const DRAFT_EVENT = "tc-owner-listing-draft-updated";

export default function OwnerDraftResumeNotice() {
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    function syncDraftState() {
      try {
        const raw = window.localStorage.getItem(OWNER_LISTING_DRAFT_KEY);
        if (!raw) {
          setSavedAt(null);
          return;
        }
        const parsed = JSON.parse(raw) as { savedAt?: string };
        setSavedAt(parsed.savedAt ?? null);
      } catch {
        window.localStorage.removeItem(OWNER_LISTING_DRAFT_KEY);
        setSavedAt(null);
      }
    }

    syncDraftState();
    window.addEventListener("storage", syncDraftState);
    window.addEventListener(DRAFT_EVENT, syncDraftState);
    return () => {
      window.removeEventListener("storage", syncDraftState);
      window.removeEventListener(DRAFT_EVENT, syncDraftState);
    };
  }, []);

  if (!savedAt) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">You have an unfinished listing.</p>
      <p className="mt-1">
        Last saved {new Date(savedAt).toLocaleString()}.
      </p>
      <Link className="mt-3 inline-flex rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm" href="/listings/new">
        Resume draft
      </Link>
    </div>
  );
}
