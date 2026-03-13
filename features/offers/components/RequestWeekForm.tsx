"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RequestWeekFormProps = {
  listingId: string;
  availabilityMode?: "exact" | "flex";
  exactCheckInDate?: string | null;
  exactCheckOutDate?: string | null;
  availableStartDate?: string | null;
  availableEndDate?: string | null;
  minimumNights?: number | null;
  maximumNights?: number | null;
};

export default function RequestWeekForm({
  listingId,
  availabilityMode = "exact",
  exactCheckInDate,
  exactCheckOutDate,
  availableStartDate,
  availableEndDate,
  minimumNights,
  maximumNights,
}: RequestWeekFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [guestCount, setGuestCount] = useState("2");
  const [desiredCheckInDate, setDesiredCheckInDate] = useState("");
  const [desiredCheckOutDate, setDesiredCheckOutDate] = useState("");
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

      if (availabilityMode === "flex") {
        if (!desiredCheckInDate || !desiredCheckOutDate) {
          throw new Error("Choose your requested check-in and check-out dates.");
        }
        if (desiredCheckOutDate <= desiredCheckInDate) {
          throw new Error("Requested check-out must be after requested check-in.");
        }
        const requestedNights =
          (new Date(`${desiredCheckOutDate}T00:00:00`).getTime() - new Date(`${desiredCheckInDate}T00:00:00`).getTime()) /
          (1000 * 60 * 60 * 24);
        if (availableStartDate && desiredCheckInDate < availableStartDate) {
          throw new Error("Requested check-in is before the available window.");
        }
        if (availableEndDate && desiredCheckOutDate > availableEndDate) {
          throw new Error("Requested check-out is after the available window.");
        }
        if (minimumNights && requestedNights < minimumNights) {
          throw new Error(`Requested stay must be at least ${minimumNights} nights.`);
        }
        if (maximumNights && requestedNights > maximumNights) {
          throw new Error(`Requested stay must be ${maximumNights} nights or less.`);
        }
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
        desired_check_in_date: availabilityMode === "flex" ? desiredCheckInDate : null,
        desired_check_out_date: availabilityMode === "flex" ? desiredCheckOutDate : null,
        status: "new",
      });

      if (error) throw error;

      setMessage("Request submitted. You can track updates in My Trips.");
      setNote("");
      setGuestCount("2");
      setDesiredCheckInDate("");
      setDesiredCheckOutDate("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tc-surface space-y-3 rounded-xl p-4" onSubmit={onSubmit}>
      <h2 className="tc-title text-base font-semibold">
        {availabilityMode === "flex" ? "Request this availability" : "Request this week"}
      </h2>
      {availabilityMode === "exact" && exactCheckInDate && exactCheckOutDate ? (
        <p className="text-xs text-zinc-600">
          This listing is for {exactCheckInDate} to {exactCheckOutDate}.
        </p>
      ) : null}
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
      {availabilityMode === "flex" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Requested check-in
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              max={availableEndDate ?? undefined}
              min={availableStartDate ?? undefined}
              required
              type="date"
              value={desiredCheckInDate}
              onChange={(e) => setDesiredCheckInDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Requested check-out
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              max={availableEndDate ?? undefined}
              min={availableStartDate ?? undefined}
              required
              type="date"
              value={desiredCheckOutDate}
              onChange={(e) => setDesiredCheckOutDate(e.target.value)}
            />
          </label>
        </div>
      ) : null}
      {availabilityMode === "flex" ? (
        <p className="text-xs text-zinc-600">
          Search window: {availableStartDate || "-"} to {availableEndDate || "-"}.
          {minimumNights ? ` Min ${minimumNights} nights.` : ""}
          {maximumNights ? ` Max ${maximumNights} nights.` : ""}
        </p>
      ) : null}
      <label className="block text-sm">
        Note (optional)
        <textarea
          className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
          placeholder={
            availabilityMode === "flex"
              ? "Share preferred dates, date flexibility, or unit preferences"
              : "Any arrival details or special notes"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        className="tc-btn-primary w-full rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : availabilityMode === "flex" ? "Request availability" : "Request this week"}
      </button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
