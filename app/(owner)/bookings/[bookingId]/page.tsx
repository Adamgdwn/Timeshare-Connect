import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";
import BookingStatusSteps from "@/features/bookings/components/BookingStatusSteps";
import BookingOwnerUpdateForm from "@/features/bookings/components/BookingOwnerUpdateForm";
import TravelerPaymentActions from "@/features/bookings/components/TravelerPaymentActions";
import { calculatePayoutBreakdown } from "@/lib/pricing";
import BookingCancelForm from "@/features/bookings/components/BookingCancelForm";
import LeaveUserReviewForm from "@/features/reviews/components/LeaveUserReviewForm";
import LeaveResortReviewForm from "@/features/reviews/components/LeaveResortReviewForm";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function OwnerBookingProgressPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/bookings/${bookingId}`);
  }

  const selectWithCancelFields =
    "id,status,listing_id,offer_id,traveler_id,owner_id,confirmation_number,proof_file_path,cancel_reason,canceled_by,canceled_at,admin_verified_at,first_payment_paid_at,final_payment_paid_at,created_at,listings(resort_name,city,check_in_date,check_out_date,unit_type,owner_price_cents),offers(guest_count,note,status)";
  const selectWithoutCancelFields =
    "id,status,listing_id,offer_id,traveler_id,owner_id,confirmation_number,proof_file_path,admin_verified_at,first_payment_paid_at,final_payment_paid_at,created_at,listings(resort_name,city,check_in_date,check_out_date,unit_type,owner_price_cents),offers(guest_count,note,status)";

  let { data: booking, error } = await supabase
    .from("bookings")
    .select(selectWithCancelFields)
    .eq("id", bookingId)
    .maybeSingle();

  // Backward-compatible fallback when cancellation migration hasn't run yet.
  if (error && /cancel_reason|canceled_by|canceled_at/i.test(error.message || "")) {
    const retry = await supabase
      .from("bookings")
      .select(selectWithoutCancelFields)
      .eq("id", bookingId)
      .maybeSingle();

    error = retry.error;
    booking = retry.data
      ? {
          ...retry.data,
          cancel_reason: null,
          canceled_by: null,
          canceled_at: null,
        }
      : retry.data;
  }

  if (error || !booking) {
    notFound();
  }

  const isOwner = booking.owner_id === user.id;
  const isTraveler = booking.traveler_id === user.id;
  const listing = Array.isArray(booking.listings) ? booking.listings[0] : booking.listings;
  const offer = Array.isArray(booking.offers) ? booking.offers[0] : booking.offers;
  const payout = calculatePayoutBreakdown(listing?.owner_price_cents || 0);
  const ownerCanSubmitProof =
    booking.status === "first_payment_paid" || booking.status === "owner_booked_pending_verification";
  const ownerLockedReason =
    booking.status === "awaiting_first_payment"
      ? "Traveler has not paid first 50% yet."
      : booking.status === "verified_awaiting_final_payment" || booking.status === "fully_paid"
        ? "Booking has already moved past owner submission."
        : booking.status === "canceled" || booking.status === "refunded"
          ? "This booking is no longer active."
          : undefined;
  const canCancel = !["fully_paid", "refunded", "canceled"].includes(booking.status);
  const { data: existingReviews } = await supabase
    .from("user_reviews")
    .select("reviewer_id,reviewed_user_id,rating")
    .eq("booking_id", booking.id);
  const hasTravelerReviewedOwner =
    (existingReviews ?? []).some((review) => review.reviewer_id === booking.traveler_id && review.reviewed_user_id === booking.owner_id);
  const hasOwnerReviewedTraveler =
    (existingReviews ?? []).some((review) => review.reviewer_id === booking.owner_id && review.reviewed_user_id === booking.traveler_id);
  const { data: existingResortReviews } = await supabase
    .from("resort_reviews")
    .select("reviewer_id,listing_id")
    .eq("booking_id", booking.id);
  const hasTravelerReviewedResort =
    (existingResortReviews ?? []).some(
      (review) => review.reviewer_id === booking.traveler_id && review.listing_id === booking.listing_id
    );

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Booking Progress</h1>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Link className="rounded border border-zinc-300 px-3 py-2 text-sm" href="/offers">
              Back to offers
            </Link>
          ) : (
            <Link className="rounded border border-zinc-300 px-3 py-2 text-sm" href="/trips">
              Back to trips
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <h2 className="text-base font-semibold">Booking Summary</h2>
          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p>
              <span className="font-medium">Resort:</span> {listing?.resort_name}
            </p>
            <p>
              <span className="font-medium">City:</span> {listing?.city}
            </p>
            <p>
              <span className="font-medium">Dates:</span> {listing?.check_in_date} to {listing?.check_out_date}
            </p>
            <p>
              <span className="font-medium">Unit:</span> {listing?.unit_type}
            </p>
            <p>
              <span className="font-medium">Guests:</span> {offer?.guest_count || "-"}
            </p>
            <p>
              <span className="font-medium">Price:</span>{" "}
              {listing?.owner_price_cents ? formatMoney(listing.owner_price_cents) : "-"}
            </p>
            <p>
              <span className="font-medium">Platform fee (5%):</span> {formatMoney(payout.platformFeeCents)}
            </p>
            <p>
              <span className="font-medium">Owner net payout:</span> {formatMoney(payout.ownerNetCents)}
            </p>
            <p>
              <span className="font-medium">Booking status:</span> {booking.status.replaceAll("_", " ")}
            </p>
            <p>
              <span className="font-medium">Offer status:</span> {offer?.status?.replaceAll("_", " ") || "-"}
            </p>
          </div>

          {offer?.note ? (
            <p className="rounded bg-zinc-50 p-3 text-sm text-zinc-700">
              <span className="font-medium">Traveler note:</span> {offer.note}
            </p>
          ) : null}

          <div className="space-y-2 rounded border border-zinc-200 p-3 text-sm">
            <p>
              <span className="font-medium">Confirmation number:</span> {booking.confirmation_number || "Not submitted yet"}
            </p>
            <p>
              <span className="font-medium">Proof:</span> {booking.proof_file_path || "Not submitted yet"}
            </p>
            <p>
              <span className="font-medium">Admin verified at:</span> {booking.admin_verified_at || "Not verified yet"}
            </p>
            {booking.canceled_at ? (
              <>
                <p>
                  <span className="font-medium">Canceled at:</span> {booking.canceled_at}
                </p>
                <p>
                  <span className="font-medium">Cancellation reason:</span> {booking.cancel_reason || "No reason provided"}
                </p>
              </>
            ) : null}
          </div>

          {isTraveler ? (
            <div className="rounded border border-zinc-200 p-3">
              <h3 className="text-sm font-semibold">Traveler Actions</h3>
              <p className="mt-1 text-xs text-zinc-600">
                Payment actions are manual placeholders until Stripe checkout is wired.
              </p>
              <div className="mt-3">
                <TravelerPaymentActions bookingId={booking.id} status={booking.status} />
              </div>
              <div className="mt-3">
                <BookingCancelForm bookingId={booking.id} canCancel={canCancel} />
              </div>
              {booking.status === "fully_paid" ? (
                <div className="mt-3">
                  {hasTravelerReviewedOwner ? (
                    <p className="text-xs text-zinc-600">You have already rated this owner.</p>
                  ) : (
                    <LeaveUserReviewForm bookingId={booking.id} reviewedUserId={booking.owner_id} targetLabel="Owner" />
                  )}
                </div>
              ) : null}
              {booking.status === "fully_paid" ? (
                <div className="mt-3">
                  {hasTravelerReviewedResort ? (
                    <p className="text-xs text-zinc-600">You have already rated this resort stay.</p>
                  ) : (
                    <LeaveResortReviewForm
                      bookingId={booking.id}
                      listingId={booking.listing_id}
                      resortLabel={`${listing?.resort_name || "Resort"}${listing?.city ? ` (${listing.city})` : ""}`}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded border border-zinc-200 p-4">
            <h2 className="mb-3 text-base font-semibold">Workflow Steps</h2>
            <BookingStatusSteps status={booking.status} />
          </div>

          {isOwner ? (
            <>
              <BookingOwnerUpdateForm
                bookingId={booking.id}
                canSubmit={ownerCanSubmitProof}
                currentStatus={booking.status}
                initialConfirmationNumber={booking.confirmation_number}
                initialProofPath={booking.proof_file_path}
                lockedReason={ownerLockedReason}
              />
              <BookingCancelForm bookingId={booking.id} canCancel={canCancel} />
              {booking.status === "fully_paid" ? (
                <>
                  {hasOwnerReviewedTraveler ? (
                    <p className="rounded border border-zinc-200 p-3 text-xs text-zinc-600">You have already rated this traveler.</p>
                  ) : (
                    <LeaveUserReviewForm bookingId={booking.id} reviewedUserId={booking.traveler_id} targetLabel="Traveler" />
                  )}
                </>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
