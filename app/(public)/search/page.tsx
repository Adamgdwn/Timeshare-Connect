import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const checkIn = (params.checkIn || "").trim();
  const checkOut = (params.checkOut || "").trim();

  const supabase = await createServerClient();

  let query = supabase
    .from("listings")
    .select(
      "id,owner_id,resort_name,city,country,check_in_date,check_out_date,unit_type,owner_price_cents,normal_price_cents,is_active"
    )
    .eq("is_active", true)
    .order("check_in_date", { ascending: true })
    .limit(100);

  if (q) {
    query = query.or(`resort_name.ilike.%${q}%,city.ilike.%${q}%`);
  }

  if (checkIn && checkOut) {
    query = query.lte("check_in_date", checkOut).gte("check_out_date", checkIn);
  } else if (checkIn) {
    query = query.gte("check_out_date", checkIn);
  } else if (checkOut) {
    query = query.lte("check_in_date", checkOut);
  }

  const { data: listings, error } = await query;
  const ownerIds = Array.from(new Set((listings ?? []).map((listing) => listing.owner_id)));
  const ratingByOwnerId = new Map<string, { avg: number; count: number }>();
  if (ownerIds.length > 0) {
    const { data: ownerReviews } = await supabase.from("user_reviews").select("reviewed_user_id,rating").in("reviewed_user_id", ownerIds);
    const ownerBuckets = new Map<string, { total: number; count: number }>();
    (ownerReviews ?? []).forEach((review) => {
      const bucket = ownerBuckets.get(review.reviewed_user_id) ?? { total: 0, count: 0 };
      bucket.total += review.rating;
      bucket.count += 1;
      ownerBuckets.set(review.reviewed_user_id, bucket);
    });
    ownerBuckets.forEach((bucket, ownerId) => {
      ratingByOwnerId.set(ownerId, { avg: bucket.total / bucket.count, count: bucket.count });
    });
  }

  const listingIds = (listings ?? []).map((listing) => listing.id);
  const ratingByListingId = new Map<string, { avg: number; count: number }>();
  if (listingIds.length > 0) {
    const { data: resortReviews } = await supabase.from("resort_reviews").select("listing_id,rating").in("listing_id", listingIds);
    const listingBuckets = new Map<string, { total: number; count: number }>();
    (resortReviews ?? []).forEach((review) => {
      const bucket = listingBuckets.get(review.listing_id) ?? { total: 0, count: 0 };
      bucket.total += review.rating;
      bucket.count += 1;
      listingBuckets.set(review.listing_id, bucket);
    });
    listingBuckets.forEach((bucket, listingId) => {
      ratingByListingId.set(listingId, { avg: bucket.total / bucket.count, count: bucket.count });
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Search Listings</h1>
      <p className="mt-3 text-sm text-zinc-600">Find active listings by location/resort and optional travel dates.</p>

      <form className="mt-6 grid gap-3 rounded border border-zinc-200 p-4 sm:grid-cols-4" method="get">
        <label className="block text-sm sm:col-span-2">
          Location or resort
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            defaultValue={q}
            name="q"
            placeholder="Orlando or resort name"
          />
        </label>
        <label className="block text-sm">
          Check-in
          <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" defaultValue={checkIn} name="checkIn" type="date" />
        </label>
        <label className="block text-sm">
          Check-out
          <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" defaultValue={checkOut} name="checkOut" type="date" />
        </label>
        <div className="sm:col-span-4">
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white" type="submit">
            Search
          </button>
        </div>
      </form>

      {error ? <p className="mt-6 text-sm text-red-700">Failed to load listings: {error.message}</p> : null}

      {!error && (!listings || listings.length === 0) ? (
        <p className="mt-6 text-sm text-zinc-600">No listings match your search.</p>
      ) : null}

      {listings && listings.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {listings.map((listing) => (
            <article className="rounded border border-zinc-200 p-4" key={listing.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{listing.resort_name}</h2>
                  <p className="text-sm text-zinc-600">
                    {listing.city}
                    {listing.country ? `, ${listing.country}` : ""}
                  </p>
                </div>
                <Link className="rounded border border-zinc-300 px-3 py-1.5 text-sm" href={`/listings/${listing.id}`}>
                  View details
                </Link>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <p>
                  <span className="font-medium">Dates:</span> {listing.check_in_date} to {listing.check_out_date}
                </p>
                <p>
                  <span className="font-medium">Unit:</span> {listing.unit_type}
                </p>
                <p>
                  <span className="font-medium">Owner price:</span> {formatMoney(listing.owner_price_cents)}
                </p>
                <p>
                  <span className="font-medium">Normal price:</span> {formatMoney(listing.normal_price_cents)}
                </p>
                <p>
                  <span className="font-medium">Owner rating:</span>{" "}
                  {ratingByOwnerId.get(listing.owner_id)
                    ? `${ratingByOwnerId.get(listing.owner_id)!.avg.toFixed(1)} / 5 (${ratingByOwnerId.get(listing.owner_id)!.count})`
                    : "No ratings yet"}
                </p>
                <p>
                  <span className="font-medium">Resort rating:</span>{" "}
                  {ratingByListingId.get(listing.id)
                    ? `${ratingByListingId.get(listing.id)!.avg.toFixed(1)} / 5 (${ratingByListingId.get(listing.id)!.count})`
                    : "No ratings yet"}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}
