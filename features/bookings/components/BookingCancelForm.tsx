"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingCancelFormProps = {
  bookingId: string;
  canCancel: boolean;
};

export default function BookingCancelForm({ bookingId, canCancel }: BookingCancelFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const trimmedReason = reason.trim();
      if (trimmedReason.length < 5) {
        throw new Error("Please provide a short cancellation reason.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in.");

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "canceled",
          cancel_reason: trimmedReason,
          canceled_by: user.id,
          canceled_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .neq("status", "fully_paid")
        .neq("status", "refunded")
        .neq("status", "canceled");

      if (error) {
        // Backward-compatible fallback if cancellation columns are missing.
        if (/cancel_reason|canceled_by|canceled_at/i.test(error.message || "")) {
          const fallback = await supabase
            .from("bookings")
            .update({
              status: "canceled",
            })
            .eq("id", bookingId)
            .neq("status", "fully_paid")
            .neq("status", "refunded")
            .neq("status", "canceled");

          if (fallback.error) throw fallback.error;
          setMessage("Booking canceled (reason fields unavailable until migration runs).");
          setReason("");
          router.refresh();
          return;
        }

        throw error;
      }

      setMessage("Booking canceled.");
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? `Failed to cancel booking: ${error.message}` : "Failed to cancel booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-2 rounded border border-zinc-200 p-3" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">Cancel Booking</h3>
      <textarea
        className="min-h-20 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        disabled={!canCancel || isSubmitting}
        placeholder={canCancel ? "Reason for canceling..." : "Cancellation is not available for this booking status."}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canCancel || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Canceling..." : "Cancel booking"}
      </button>
      {message ? <p className="text-xs text-zinc-700">{message}</p> : null}
    </form>
  );
}
