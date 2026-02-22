"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RequestWeekFormProps = {
  listingId: string;
};

export default function RequestWeekForm({ listingId }: RequestWeekFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [guestCount, setGuestCount] = useState("2");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const count = Number(guestCount);
      if (!Number.isFinite(count) || count <= 0) {
        throw new Error("Guest count must be at least 1.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push(`/login?next=${encodeURIComponent(pathname || `/listings/${listingId}`)}`);
        return;
      }

      const { error } = await supabase.from("offers").insert({
        listing_id: listingId,
        traveler_id: user.id,
        guest_count: count,
        note: note || null,
        status: "new",
      });

      if (error) throw error;

      setMessage("Request submitted. You can track updates in My Trips.");
      setNote("");
      setGuestCount("2");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tc-surface space-y-3 rounded-xl p-4" onSubmit={onSubmit}>
      <h2 className="tc-title text-base font-semibold">Request this week</h2>
      <label className="block text-sm">
        Guest count
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          min="1"
          required
          step="1"
          type="number"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Note (optional)
        <textarea
          className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="Any arrival details or special notes"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        className="tc-btn-primary w-full rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Request this week"}
      </button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
