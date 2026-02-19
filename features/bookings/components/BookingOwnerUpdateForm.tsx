"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingOwnerUpdateFormProps = {
  bookingId: string;
  initialConfirmationNumber: string | null;
  initialProofPath: string | null;
  currentStatus: string;
  canSubmit: boolean;
  lockedReason?: string;
};

export default function BookingOwnerUpdateForm({
  bookingId,
  initialConfirmationNumber,
  initialProofPath,
  currentStatus,
  canSubmit,
  lockedReason,
}: BookingOwnerUpdateFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [confirmationNumber, setConfirmationNumber] = useState(initialConfirmationNumber || "");
  const [proofPath, setProofPath] = useState(initialProofPath || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      if (!confirmationNumber.trim()) {
        throw new Error("Confirmation number is required.");
      }

      if (!proofPath.trim()) {
        throw new Error("Proof file path or URL is required.");
      }

      const nextStatus =
        currentStatus === "verified_awaiting_final_payment" || currentStatus === "fully_paid"
          ? currentStatus
          : "owner_booked_pending_verification";

      const { error } = await supabase
        .from("bookings")
        .update({
          confirmation_number: confirmationNumber.trim(),
          proof_file_path: proofPath.trim(),
          status: nextStatus,
        })
        .eq("id", bookingId);

      if (error) throw error;

      setMessage("Booking confirmation saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update booking.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-3 rounded border border-zinc-200 p-4" onSubmit={onSubmit}>
      <h2 className="text-base font-semibold">Owner Booking Update</h2>
      <p className="text-xs text-zinc-600">After booking in the resort portal, provide confirmation and proof.</p>
      {!canSubmit ? <p className="rounded bg-zinc-100 p-2 text-xs text-zinc-700">{lockedReason || "Owner update is not available yet."}</p> : null}
      <label className="block text-sm">
        Confirmation number
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          disabled={!canSubmit || isSaving}
          required
          value={confirmationNumber}
          onChange={(e) => setConfirmationNumber(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Proof file path or URL
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          disabled={!canSubmit || isSaving}
          placeholder="storage/bookings/abc-proof.pdf or https://..."
          required
          value={proofPath}
          onChange={(e) => setProofPath(e.target.value)}
        />
      </label>
      <button
        className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit || isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : canSubmit ? "Save booking proof" : "Waiting on traveler payment"}
      </button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
