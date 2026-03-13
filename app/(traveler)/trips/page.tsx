import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";
import TravelerPaymentActions from "@/features/bookings/components/TravelerPaymentActions";
import { formatListingDateSummary, formatRequestedStaySummary } from "@/lib/listings/availability";

type OfferRow = {
  id: string;
  listing_id: string;
  guest_count: number;
  note: string | null;
  status: string;
  created_at: string;
  desired_check_in_date: string | null;
  desired_check_out_date: string | null;
  listings: {
    availability_mode: "exact" | "flex";
    available_start_date: string | null;
    available_end_date: string | null;
    minimum_nights: number | null;
    maximum_nights: number | null;
    resort_name: string;
    city: string;
    check_in_date: string | null;
    check_out_date: string | null;
    owner_price_cents: number;
  };
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function statusLabel(offerStatus: string, bookingStatus?: string) {
  if (bookingStatus === "awaiting_first_payment") return "Accepted - pay 50%";
  if (bookingStatus === "first_payment_paid") return "50% paid - waiting for owner to book";
  if (bookingStatus === "owner_booked_pending_verification") return "Owner booked - pending verification";
  if (bookingStatus === "verified_awaiting_final_payment") return "Confirmed - pay final 50%";
  if (bookingStatus === "fully_paid") return "Completed";
  if (bookingStatus === "canceled") return "Canceled";
  if (bookingStatus === "refunded") return "Refunded";

  if (offerStatus === "new") return "Requested - waiting for owner";
  if (offerStatus === "accepted") return "Accepted - creating booking";
  if (offerStatus === "declined") return "Declined";
  if (offerStatus === "withdrawn") return "Withdrawn";
  if (offerStatus === "expired") return "Expired";
  return offerStatus;
}

export default async function TravelerTripsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">My Trips</h1>
          <SignOutButton />
        </div>
        <p className="mt-3 text-sm text-zinc-600">You need to log in first.</p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("offers")
    .select(
      "id,listing_id,guest_count,note,desired_check_in_date,desired_check_out_date,status,created_at,listings!inner(availability_mode,available_start_date,available_end_date,minimum_nights,maximum_nights,resort_name,city,check_in_date,check_out_date,owner_price_cents)"
    )
    .eq("traveler_id", user.id)
    .order("created_at", { ascending: false });

  const offers = (data ?? []) as unknown as OfferRow[];
  const offerIds = offers.map((offer) => offer.id);
  const bookingByOffer = new Map<string, { id: string; status: string }>();

  if (offerIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id,offer_id,status")
      .in("offer_id", offerIds)
      .eq("traveler_id", user.id);

    (bookings ?? []).forEach((booking) => {
      bookingByOffer.set(booking.offer_id, { id: booking.id, status: booking.status });
    });
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Trips</h1>
        <div className="flex items-center gap-2">
          <Link className="rounded border border-zinc-300 px-3 py-2 text-sm" href="/search">
            Find listings
          </Link>
          <SignOutButton />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">Failed to load trips: {error.message}</p> : null}

      {!error && offers.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No requests yet. Start by searching listings.</p>
      ) : null}

      {offers.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Guests</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const booking = bookingByOffer.get(offer.id);
                const label = statusLabel(offer.status, booking?.status);

                return (
                  <tr className="border-t border-zinc-200 align-top" key={offer.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{offer.listings.resort_name}</div>
                      <div className="text-zinc-600">{offer.listings.city}</div>
                      <Link className="text-xs text-zinc-700 underline" href={`/listings/${offer.listing_id}`}>
                        View listing
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {formatListingDateSummary({
                          availability_mode: offer.listings.availability_mode,
                          check_in_date: offer.listings.check_in_date,
                          check_out_date: offer.listings.check_out_date,
                          available_start_date: offer.listings.available_start_date,
                          available_end_date: offer.listings.available_end_date,
                          minimum_nights: offer.listings.minimum_nights,
                          maximum_nights: offer.listings.maximum_nights,
                        })}
                      </div>
                      {offer.listings.availability_mode === "flex" ? (
                        <div className="text-xs text-zinc-500">{formatRequestedStaySummary(offer)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{offer.guest_count}</td>
                    <td className="px-4 py-3">{formatMoney(offer.listings.owner_price_cents)}</td>
                    <td className="px-4 py-3">{label}</td>
                    <td className="px-4 py-3">
                      {booking ? <TravelerPaymentActions bookingId={booking.id} status={booking.status} /> : null}
                      {booking ? (
                        <div className="mt-2">
                          <Link className="text-xs underline" href={`/bookings/${booking.id}`}>
                            Open booking timeline
                          </Link>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
