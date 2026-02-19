import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  const diff = end - start;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    minPrice?: string;
    maxPrice?: string;
    unitType?: string;
    minOwnerRating?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const checkIn = (params.checkIn || "").trim();
  const checkOut = (params.checkOut || "").trim();
  const guests = (params.guests || "").trim();
  const unitType = (params.unitType || "").trim();
  const sort = (params.sort || "checkin_asc").trim();
  const minPrice = Number((params.minPrice || "").trim());
  const maxPrice = Number((params.maxPrice || "").trim());
  const minOwnerRating = Number((params.minOwnerRating || "").trim());

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

  if (Number.isFinite(minPrice) && minPrice > 0) {
    query = query.gte("owner_price_cents", Math.round(minPrice * 100));
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    query = query.lte("owner_price_cents", Math.round(maxPrice * 100));
  }

  if (unitType && unitType !== "any") {
    query = query.ilike("unit_type", `%${unitType}%`);
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

  const withRatings = (listings ?? []).map((listing) => ({
    ...listing,
    ownerRating: ratingByOwnerId.get(listing.owner_id) ?? null,
    resortRating: ratingByListingId.get(listing.id) ?? null,
  }));

  const filteredByRating =
    Number.isFinite(minOwnerRating) && minOwnerRating >= 1 && minOwnerRating <= 5
      ? withRatings.filter((listing) => (listing.ownerRating?.avg ?? 0) >= minOwnerRating)
      : withRatings;

  const sortedListings = [...filteredByRating].sort((a, b) => {
    if (sort === "price_asc") return a.owner_price_cents - b.owner_price_cents;
    if (sort === "price_desc") return b.owner_price_cents - a.owner_price_cents;
    if (sort === "savings_desc") {
      return b.normal_price_cents - b.owner_price_cents - (a.normal_price_cents - a.owner_price_cents);
    }

    return a.check_in_date.localeCompare(b.check_in_date);
  });

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-8">
      <h1 className="text-2xl font-semibold">Find a Timeshare Stay</h1>
      <p className="mt-2 text-sm text-zinc-600">Clean, practical search for destination, dates, and value.</p>

      <form className="mt-5 grid gap-2 rounded border border-zinc-200 bg-white p-3 md:grid-cols-12 md:items-end" method="get">
        <label className="block text-xs font-medium text-zinc-700 md:col-span-4">
          Destination or resort
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Orlando, Maui, Marriott..."
          />
        </label>
        <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
          Check-in
          <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" defaultValue={checkIn} name="checkIn" type="date" />
        </label>
        <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
          Check-out
          <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" defaultValue={checkOut} name="checkOut" type="date" />
        </label>
        <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
          Guests
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            defaultValue={guests}
            min={1}
            name="guests"
            placeholder="2"
            type="number"
          />
        </label>
        <div className="flex gap-2 md:col-span-2">
          <button className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white" type="submit">
            Search
          </button>
          <Link className="rounded border border-zinc-300 px-3 py-2 text-sm" href="/search">
            Clear
          </Link>
        </div>
      </form>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold">Filters</h2>
          <form className="mt-3 space-y-3" method="get">
            <input defaultValue={q} name="q" type="hidden" />
            <input defaultValue={checkIn} name="checkIn" type="hidden" />
            <input defaultValue={checkOut} name="checkOut" type="hidden" />
            <input defaultValue={guests} name="guests" type="hidden" />

            <label className="block text-xs font-medium text-zinc-700">
              Min price (USD)
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                defaultValue={params.minPrice || ""}
                min={0}
                name="minPrice"
                type="number"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Max price (USD)
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                defaultValue={params.maxPrice || ""}
                min={0}
                name="maxPrice"
                type="number"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Unit type
              <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" defaultValue={unitType || "any"} name="unitType">
                <option value="any">Any</option>
                <option value="studio">Studio</option>
                <option value="1 bedroom">1 bedroom</option>
                <option value="2 bedroom">2 bedroom</option>
                <option value="3 bedroom">3 bedroom</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Minimum owner rating
              <select
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                defaultValue={params.minOwnerRating || ""}
                name="minOwnerRating"
              >
                <option value="">Any</option>
                <option value="4">4.0+</option>
                <option value="4.5">4.5+</option>
                <option value="5">5.0</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Sort by
              <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" defaultValue={sort} name="sort">
                <option value="checkin_asc">Check-in (soonest)</option>
                <option value="price_asc">Price (low to high)</option>
                <option value="price_desc">Price (high to low)</option>
                <option value="savings_desc">Savings (highest)</option>
              </select>
            </label>

            <button className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
              Apply filters
            </button>
          </form>
        </aside>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-zinc-700">
              {sortedListings.length} stay{sortedListings.length === 1 ? "" : "s"} found
            </p>
            {guests ? <p className="text-xs text-zinc-600">For {guests} guest{guests === "1" ? "" : "s"}</p> : null}
          </div>

          {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to load listings: {error.message}</p> : null}

          {!error && sortedListings.length === 0 ? (
            <p className="rounded border border-zinc-200 p-4 text-sm text-zinc-600">No listings match your filters. Try removing one filter.</p>
          ) : null}

          {sortedListings.length > 0 ? (
            <div className="space-y-3">
              {sortedListings.map((listing) => {
                const savingsCents = listing.normal_price_cents - listing.owner_price_cents;
                return (
                  <article className="rounded border border-zinc-200 p-4" key={listing.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{listing.resort_name}</h2>
                        <p className="text-sm text-zinc-600">
                          {listing.city}
                          {listing.country ? `, ${listing.country}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">
                          {formatDate(listing.check_in_date)} to {formatDate(listing.check_out_date)} ({getNights(listing.check_in_date, listing.check_out_date)} nights)
                        </p>
                        <p className="text-sm text-zinc-700">{listing.unit_type}</p>
                      </div>
                      <div className="min-w-[170px] text-right">
                        <p className="text-xs text-zinc-500 line-through">{formatMoney(listing.normal_price_cents)} normal</p>
                        <p className="text-2xl font-semibold">{formatMoney(listing.owner_price_cents)}</p>
                        <p className="text-xs text-emerald-700">Save {formatMoney(Math.max(0, savingsCents))}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-700">
                        <span>
                          Owner:{" "}
                          {listing.ownerRating ? `${listing.ownerRating.avg.toFixed(1)} / 5 (${listing.ownerRating.count})` : "No ratings yet"}
                        </span>
                        <span>
                          Resort:{" "}
                          {listing.resortRating ? `${listing.resortRating.avg.toFixed(1)} / 5 (${listing.resortRating.count})` : "No ratings yet"}
                        </span>
                      </div>
                      <Link className="rounded border border-zinc-300 px-3 py-1.5 text-sm" href={`/listings/${listing.id}`}>
                        View details
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
