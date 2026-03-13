"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OwnerOfferActionsProps = {
  offerId: string;
  listingId: string;
  travelerId: string;
  ownerId: string;
  currentStatus: string;
  listingAvailabilityMode: "exact" | "flex";
  listingCheckInDate?: string | null;
  listingCheckOutDate?: string | null;
  desiredCheckInDate?: string | null;
  desiredCheckOutDate?: string | null;
  bookingId?: string;
};

export default function OwnerOfferActions({
  offerId,
  listingId,
  travelerId,
  ownerId,
  currentStatus,
  listingAvailabilityMode,
  listingCheckInDate,
  listingCheckOutDate,
  desiredCheckInDate,
  desiredCheckOutDate,
  bookingId,
}: OwnerOfferActionsProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [message, setMessage] = useState("");

  async function handleAccept() {
    setLoading("accept");
    setMessage("");

    try {
      const { error: offerError } = await supabase.from("offers").update({ status: "accepted" }).eq("id", offerId);
      if (offerError) throw offerError;

      const confirmedCheckInDate = listingAvailabilityMode === "flex" ? desiredCheckInDate ?? null : listingCheckInDate ?? null;
      const confirmedCheckOutDate = listingAvailabilityMode === "flex" ? desiredCheckOutDate ?? null : listingCheckOutDate ?? null;

      if (listingAvailabilityMode === "flex" && (!confirmedCheckInDate || !confirmedCheckOutDate)) {
        throw new Error("Flexible availability offers must include traveler-requested dates before acceptance.");
      }

      if (!bookingId) {
        const { error: bookingError } = await supabase.from("bookings").insert({
          offer_id: offerId,
          listing_id: listingId,
          traveler_id: travelerId,
          owner_id: ownerId,
          confirmed_check_in_date: confirmedCheckInDate,
          confirmed_check_out_date: confirmedCheckOutDate,
          status: "awaiting_first_payment",
        });

        if (bookingError && bookingError.code !== "23505") {
          throw bookingError;
        }
      }

      setMessage("Offer accepted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to accept offer.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    setMessage("");

    try {
      const { error } = await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);
      if (error) throw error;
      setMessage("Offer declined.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to decline offer.");
    } finally {
      setLoading(null);
    }
  }

  const canAction = currentStatus === "new";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-zinc-900 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAction || loading !== null}
          onClick={handleAccept}
          type="button"
        >
          {loading === "accept" ? "Accepting..." : "Accept"}
        </button>
        <button
          className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAction || loading !== null}
          onClick={handleDecline}
          type="button"
        >
          {loading === "decline" ? "Declining..." : "Decline"}
        </button>
        {bookingId ? (
          <Link className="rounded border border-zinc-300 px-2 py-1 text-xs" href={`/bookings/${bookingId}`}>
            Open booking
          </Link>
        ) : null}
      </div>
      {message ? <p className="text-xs text-zinc-700">{message}</p> : null}
    </div>
  );
}
