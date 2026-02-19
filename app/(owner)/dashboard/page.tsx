import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";
import ShareListingButton from "@/features/listings/components/ShareListingButton";
import { calculatePayoutBreakdown } from "@/lib/pricing";
import OwnerWorkspaceNav from "@/features/owner/components/OwnerWorkspaceNav";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function OwnerDashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
        <p className="mt-3 text-sm text-zinc-600">You need to log in first.</p>
      </main>
    );
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select(
      "id,ownership_type,season,home_week,points_power,resort_name,city,check_in_date,check_out_date,unit_type,owner_price_cents,normal_price_cents,is_active,created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = (listings ?? []).map((listing) => listing.id);
  const offerCountByListingId = new Map<string, number>();
  let newOffersCount = 0;

  if (listingIds.length > 0) {
    const { data: offers } = await supabase.from("offers").select("listing_id,status").in("listing_id", listingIds);

    (offers ?? []).forEach((offer) => {
      const current = offerCountByListingId.get(offer.listing_id) ?? 0;
      offerCountByListingId.set(offer.listing_id, current + 1);
      if (offer.status === "new") {
        newOffersCount += 1;
      }
    });
  }

  const { data: ownerBookings } = await supabase
    .from("bookings")
    .select("status")
    .eq("owner_id", user.id);
  const activeListingsCount = (listings ?? []).filter((listing) => listing.is_active).length;
  const bookingsAwaitingOwnerAction = (ownerBookings ?? []).filter((booking) =>
    booking.status === "first_payment_paid" || booking.status === "owner_booked_pending_verification"
  ).length;
  const bookingsAwaitingTravelerPayment = (ownerBookings ?? []).filter((booking) => booking.status === "awaiting_first_payment").length;

  const { data: ownerReviews } = await supabase
    .from("user_reviews")
    .select("rating,comment,created_at")
    .eq("reviewed_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const ownerReviewCount = (ownerReviews ?? []).length;
  const ownerAverageRating =
    ownerReviewCount > 0
      ? (ownerReviews ?? []).reduce((sum, review) => sum + review.rating, 0) / ownerReviewCount
      : null;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
        <div className="flex items-center gap-2">
          <OwnerWorkspaceNav current="dashboard" />
          <SignOutButton />
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Active Listings</p>
          <p className="mt-1 text-2xl font-semibold">{activeListingsCount}</p>
        </div>
        <Link className="rounded border border-zinc-200 p-4 transition hover:border-zinc-400" href="/offers?status=new">
          <p className="text-xs uppercase tracking-wide text-zinc-500">New Offers</p>
          <p className="mt-1 text-2xl font-semibold">{newOffersCount}</p>
        </Link>
        <Link
          className="rounded border border-zinc-200 p-4 transition hover:border-zinc-400"
          href="/offers?bookingStatus=first_payment_paid,owner_booked_pending_verification"
        >
          <p className="text-xs uppercase tracking-wide text-zinc-500">Needs Owner Action</p>
          <p className="mt-1 text-2xl font-semibold">{bookingsAwaitingOwnerAction}</p>
        </Link>
        <Link
          className="rounded border border-zinc-200 p-4 transition hover:border-zinc-400"
          href="/offers?bookingStatus=awaiting_first_payment"
        >
          <p className="text-xs uppercase tracking-wide text-zinc-500">Waiting on Traveler</p>
          <p className="mt-1 text-2xl font-semibold">{bookingsAwaitingTravelerPayment}</p>
        </Link>
      </section>

      {error ? <p className="mt-4 text-sm text-red-700">Failed to load listings: {error.message}</p> : null}

      {!error && (!listings || listings.length === 0) ? (
        <p className="mt-4 text-sm text-zinc-600">No listings yet. Create your first listing.</p>
      ) : null}

      {listings && listings.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Resort</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Inventory</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Owner Price</th>
                <th className="px-4 py-3 font-medium">Platform Fee (5%)</th>
                <th className="px-4 py-3 font-medium">Owner Net</th>
                <th className="px-4 py-3 font-medium">Normal Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Offers</th>
                <th className="px-4 py-3 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const breakdown = calculatePayoutBreakdown(listing.owner_price_cents);

                return (
                  <tr className="border-t border-zinc-200" key={listing.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{listing.resort_name}</div>
                      <div className="text-zinc-600">{listing.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      {listing.check_in_date} to {listing.check_out_date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="capitalize">{listing.ownership_type.replaceAll("_", " ")}</div>
                      {listing.ownership_type === "fixed_week" && listing.home_week ? (
                        <div className="text-xs text-zinc-600">{listing.home_week}</div>
                      ) : null}
                      {listing.ownership_type === "floating_week" && listing.season ? (
                        <div className="text-xs text-zinc-600">{listing.season}</div>
                      ) : null}
                      {listing.ownership_type === "points" && listing.points_power ? (
                        <div className="text-xs text-zinc-600">{listing.points_power.toLocaleString()} pts</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{listing.unit_type}</td>
                    <td className="px-4 py-3">{formatMoney(listing.owner_price_cents)}</td>
                    <td className="px-4 py-3">{formatMoney(breakdown.platformFeeCents)}</td>
                    <td className="px-4 py-3">{formatMoney(breakdown.ownerNetCents)}</td>
                    <td className="px-4 py-3">{formatMoney(listing.normal_price_cents)}</td>
                    <td className="px-4 py-3">{listing.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <Link className="inline-flex items-center gap-2 rounded border border-zinc-300 px-2 py-1 text-xs" href="/offers">
                        View offers
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
                          {offerCountByListingId.get(listing.id) ?? 0}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ShareListingButton
                        listingPath={`/listings/${listing.id}`}
                        listingTitle={`${listing.resort_name} (${listing.city})`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <section className="mt-8 rounded border border-zinc-200 p-4">
        <h2 className="text-lg font-semibold">Traveler Feedback</h2>
        <div className="mt-2 text-sm text-zinc-700">
          <p>
            <span className="font-medium">Owner rating:</span>{" "}
            {ownerAverageRating ? `${ownerAverageRating.toFixed(1)} / 5` : "No ratings yet"}
          </p>
          <p>
            <span className="font-medium">Recent ratings shown:</span> {ownerReviewCount}
          </p>
        </div>

        {ownerReviews && ownerReviews.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {ownerReviews.map((review, index) => (
              <li className="rounded border border-zinc-200 p-3 text-sm" key={`${review.created_at}-${index}`}>
                <div className="font-medium">{review.rating} / 5</div>
                <div className="mt-1 text-zinc-700">{review.comment || "No comment left."}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No traveler feedback yet.</p>
        )}
      </section>
    </main>
  );
}
