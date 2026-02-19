"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminBookingActionsProps = {
  bookingId: string;
  currentStatus: string;
};

export default function AdminBookingActions({ bookingId, currentStatus }: AdminBookingActionsProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<"verify" | "refund" | null>(null);
  const [message, setMessage] = useState("");

  async function markVerified() {
    setIsLoading("verify");
    setMessage("");

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "verified_awaiting_final_payment",
          admin_verified_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;
      setMessage("Marked as verified.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to verify booking.");
    } finally {
      setIsLoading(null);
    }
  }

  async function cancelAndRefund() {
    setIsLoading("refund");
    setMessage("");

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "refunded",
        })
        .eq("id", bookingId);

      if (error) throw error;
      setMessage("Marked as refunded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refund booking.");
    } finally {
      setIsLoading(null);
    }
  }

  const canVerify =
    currentStatus === "owner_booked_pending_verification" || currentStatus === "first_payment_paid";
  const canRefund =
    currentStatus !== "fully_paid" && currentStatus !== "refunded" && currentStatus !== "canceled";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-zinc-900 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canVerify || isLoading !== null}
          onClick={markVerified}
          type="button"
        >
          {isLoading === "verify" ? "Verifying..." : "Mark verified"}
        </button>
        <button
          className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canRefund || isLoading !== null}
          onClick={cancelAndRefund}
          type="button"
        >
          {isLoading === "refund" ? "Updating..." : "Cancel + refund"}
        </button>
      </div>
      {message ? <p className="text-xs text-zinc-700">{message}</p> : null}
    </div>
  );
}
