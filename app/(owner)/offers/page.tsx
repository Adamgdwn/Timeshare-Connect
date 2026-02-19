import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";
import OwnerOfferActions from "@/features/offers/components/OwnerOfferActions";
import OwnerWorkspaceNav from "@/features/owner/components/OwnerWorkspaceNav";

type OfferRow = {
  id: string;
  listing_id: string;
  traveler_id: string;
  guest_count: number;
  note: string | null;
  status: string;
  created_at: string;
};

type OwnerListingRow = {
  id: string;
  resort_name: string;
  city: string;
  check_in_date: string;
  check_out_date: string;
  owner_id: string;
};

export default async function OwnerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; bookingStatus?: string }>;
}) {
  const params = await searchParams;
  const offerStatusFilter = (params.status || "").trim();
  const bookingStatusFilter = (params.bookingStatus || "").trim();
  const bookingStatusFilters = bookingStatusFilter
    ? bookingStatusFilter
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <h1 className="text-2xl font-semibold">Owner Offers</h1>
        <p className="mt-3 text-sm text-zinc-600">You need to log in first.</p>
      </main>
    );
  }

  const { data: ownerListings, error: ownerListingsError } = await supabase
    .from("listings")
    .select("id,resort_name,city,check_in_date,check_out_date,owner_id")
    .eq("owner_id", user.id);

  const ownerListingsRows = (ownerListings ?? []) as OwnerListingRow[];
  const listingById = new Map<string, OwnerListingRow>();
  ownerListingsRows.forEach((listing) => listingById.set(listing.id, listing));

  const listingIds = ownerListingsRows.map((listing) => listing.id);

  let offers: OfferRow[] = [];
  let error = ownerListingsError ?? null;

  if (!error && listingIds.length > 0) {
    let offersQuery = supabase
      .from("offers")
      .select("id,listing_id,traveler_id,guest_count,note,status,created_at")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (offerStatusFilter) {
      offersQuery = offersQuery.eq("status", offerStatusFilter);
    }

    const { data: offersData, error: offersError } = await offersQuery;

    error = offersError;
    offers = (offersData ?? []) as OfferRow[];
  }

  const travelerIds = Array.from(new Set(offers.map((offer) => offer.traveler_id)));
  const travelerNameById = new Map<string, string | null>();

  if (!error && travelerIds.length > 0) {
    const { data: travelers } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", travelerIds);

    (travelers ?? []).forEach((profile) => travelerNameById.set(profile.id, profile.full_name));
  }

  const offerIds = offers.map((offer) => offer.id);
  const bookingByOffer = new Map<string, { id: string; status: string }>();

  if (offerIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id,offer_id,status")
      .in("offer_id", offerIds)
      .eq("owner_id", user.id);

    (bookings ?? []).forEach((booking) => {
      bookingByOffer.set(booking.offer_id, { id: booking.id, status: booking.status });
    });
  }

  const filteredOffers =
    bookingStatusFilters.length > 0
      ? offers.filter((offer) => {
          const booking = bookingByOffer.get(offer.id);
          return booking ? bookingStatusFilters.includes(booking.status) : false;
        })
      : offers;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Owner Offers</h1>
        <div className="flex items-center gap-2">
          <OwnerWorkspaceNav current="offers" />
          <SignOutButton />
        </div>
      </div>

      {offerStatusFilter || bookingStatusFilters.length > 0 ? (
        <div className="mt-4 flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
          <p className="text-zinc-700">
            Active filters:
            {offerStatusFilter ? ` offer=${offerStatusFilter}` : ""}
            {bookingStatusFilters.length > 0 ? ` booking=${bookingStatusFilters.join(",")}` : ""}
          </p>
          <Link className="rounded border border-zinc-300 px-2 py-1 text-xs" href="/offers">
            Clear filters
          </Link>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">Failed to load offers: {error.message}</p> : null}

      {!error && filteredOffers.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No offers yet.</p>
      ) : null}

      {filteredOffers.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Traveler</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Guests</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => {
                const booking = bookingByOffer.get(offer.id);
                const listing = listingById.get(offer.listing_id);
                return (
                  <tr className="border-t border-zinc-200 align-top" key={offer.id}>
                    <td className="px-4 py-3">
                      <div>{travelerNameById.get(offer.traveler_id) || "Traveler"}</div>
                      <div className="text-xs text-zinc-500">{offer.traveler_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{listing?.resort_name || "Listing"}</div>
                      <div className="text-zinc-600">{listing?.city || "-"}</div>
                      <div className="text-zinc-500">
                        {listing?.check_in_date || "-"} to {listing?.check_out_date || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{offer.guest_count}</td>
                    <td className="px-4 py-3">{offer.note || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="capitalize">{offer.status.replaceAll("_", " ")}</div>
                      {booking ? <div className="text-xs text-zinc-500">Booking: {booking.status.replaceAll("_", " ")}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <OwnerOfferActions
                        bookingId={booking?.id}
                        currentStatus={offer.status}
                        listingId={offer.listing_id}
                        offerId={offer.id}
                        ownerId={listing?.owner_id || user.id}
                        travelerId={offer.traveler_id}
                      />
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
