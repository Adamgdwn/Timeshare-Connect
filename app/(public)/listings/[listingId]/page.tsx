import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import ShareListingButton from "@/features/listings/components/ShareListingButton";
import RequestWeekForm from "@/features/offers/components/RequestWeekForm";
import { formatAmenityLabel, getOwnershipCopy, getSavingsPercentage } from "@/lib/listings/metadata";
import { formatListingDateSummary } from "@/lib/listings/availability";

type ResortPortalSummary = {
  id: string;
  resort_name: string;
  brand: string | null;
  booking_base_url: string;
  requires_login: boolean;
  supports_deeplink: boolean;
  notes: string | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  const supabase = await createServerClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id,owner_id,resort_name,city,country,availability_mode,available_start_date,available_end_date,minimum_nights,maximum_nights,ownership_type,season,home_week,points_power,check_in_date,check_out_date,unit_type,owner_price_cents,normal_price_cents,resort_booking_url,description,amenities,photo_urls,is_active,resort_portals(id,resort_name,brand,booking_base_url,requires_login,supports_deeplink,notes)"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing || !listing.is_active) {
    notFound();
  }

  const rawResortPortal = listing.resort_portals as unknown;
  const resortPortal = (
    Array.isArray(rawResortPortal) ? rawResortPortal[0] ?? null : rawResortPortal ?? null
  ) as ResortPortalSummary | null;
  const bookingLink = listing.resort_booking_url || resortPortal?.booking_base_url || null;
  const photoUrls = (listing.photo_urls ?? []) as string[];
  const amenities = (listing.amenities ?? []) as string[];
  const savingsPercentage = getSavingsPercentage(listing.owner_price_cents, listing.normal_price_cents);
  const ownershipCopy = getOwnershipCopy(listing.ownership_type);

  const { data: ownerReviews } = await supabase
    .from("user_reviews")
    .select("rating")
    .eq("reviewed_user_id", listing.owner_id);
  const ownerRatingCount = (ownerReviews ?? []).length;
  const ownerRatingAvg =
    ownerRatingCount > 0
      ? (ownerReviews ?? []).reduce((sum, review) => sum + review.rating, 0) / ownerRatingCount
      : null;

  const { data: sameResortListings } = await supabase
    .from("listings")
    .select("id")
    .eq("resort_name", listing.resort_name)
    .eq("city", listing.city);
  const sameResortListingIds = (sameResortListings ?? []).map((row) => row.id);

  let resortRatingAvg: number | null = null;
  let resortRatingCount = 0;
  if (sameResortListingIds.length > 0) {
    const { data: resortReviews } = await supabase
      .from("resort_reviews")
      .select("rating")
      .in("listing_id", sameResortListingIds);
    resortRatingCount = (resortReviews ?? []).length;
    resortRatingAvg =
      resortRatingCount > 0
        ? (resortReviews ?? []).reduce((sum, review) => sum + review.rating, 0) / resortRatingCount
        : null;
  }

  return (
    <main className="tc-page mx-auto max-w-5xl p-8">
      <h1 className="tc-title text-2xl font-semibold md:text-3xl">{listing.resort_name}</h1>
      <p className="tc-muted mt-2 text-sm">
        {listing.city}
        {listing.country ? `, ${listing.country}` : ""}
      </p>

      {photoUrls.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <img alt={listing.resort_name} className="h-72 w-full rounded-2xl object-cover" src={photoUrls[0]} />
          {photoUrls.slice(1, 3).map((photoUrl) => (
            <img alt={listing.resort_name} className="h-72 w-full rounded-2xl object-cover" key={photoUrl} src={photoUrl} />
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <section className="tc-surface space-y-4 rounded-xl p-5">
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700" key={amenity}>
                  {formatAmenityLabel(amenity)}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p>
              <span className="font-medium">Dates:</span>{" "}
              {formatListingDateSummary({
                availability_mode: listing.availability_mode,
                check_in_date: listing.check_in_date,
                check_out_date: listing.check_out_date,
                available_start_date: listing.available_start_date,
                available_end_date: listing.available_end_date,
                minimum_nights: listing.minimum_nights,
                maximum_nights: listing.maximum_nights,
              })}
            </p>
            <p>
              <span className="font-medium">Unit type:</span> {listing.unit_type}
            </p>
            <p>
              <span className="font-medium">Ownership:</span> {ownershipCopy.label}
            </p>
            <p>
              <span className="font-medium">Traveler savings:</span>{" "}
              {formatMoney(Math.max(0, listing.normal_price_cents - listing.owner_price_cents))}
              {savingsPercentage ? ` (${savingsPercentage}% off hotel pricing)` : ""}
            </p>
            <p>
              <span className="font-medium">Owner price:</span> {formatMoney(listing.owner_price_cents)}
            </p>
            <p>
              <span className="font-medium">Normal hotel price:</span> {formatMoney(listing.normal_price_cents)}
            </p>
            <p>
              <span className="font-medium">Owner rating:</span>{" "}
              {ownerRatingAvg ? `${ownerRatingAvg.toFixed(1)} / 5 (${ownerRatingCount})` : "No ratings yet"}
            </p>
            <p>
              <span className="font-medium">Resort rating:</span>{" "}
              {resortRatingAvg ? `${resortRatingAvg.toFixed(1)} / 5 (${resortRatingCount})` : "No ratings yet"}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
            {listing.home_week ? (
              <p>
                <span className="font-medium">Home week:</span> {listing.home_week}
              </p>
            ) : null}
            {listing.season ? (
              <p>
                <span className="font-medium">Season:</span> {listing.season}
              </p>
            ) : null}
            {listing.points_power ? (
              <p>
                <span className="font-medium">Points:</span> {listing.points_power.toLocaleString()}
              </p>
            ) : null}
          </div>

          {listing.description ? <p className="text-sm text-zinc-700 leading-relaxed">{listing.description}</p> : null}

          <div className="flex flex-wrap gap-2">
            {bookingLink ? (
              <a
                className="tc-btn-secondary rounded px-3 py-2 text-sm"
                href={bookingLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                Check availability on resort site
              </a>
            ) : null}
            <ShareListingButton
              listingPath={`/listings/${listing.id}`}
              listingTitle={`${listing.resort_name} (${listing.city})`}
            />
          </div>

          {resortPortal ? (
            <p className="text-xs text-zinc-600">
              Portal: {resortPortal.resort_name}
              {resortPortal.brand ? ` (${resortPortal.brand})` : ""}.{" "}
              {resortPortal.requires_login ? "Login is usually required to complete booking checks." : "Public booking access is available."}
            </p>
          ) : null}
        </section>

        <div>
          <RequestWeekForm
            availabilityMode={listing.availability_mode}
            availableEndDate={listing.available_end_date}
            availableStartDate={listing.available_start_date}
            exactCheckInDate={listing.check_in_date}
            exactCheckOutDate={listing.check_out_date}
            listingId={listing.id}
            maximumNights={listing.maximum_nights}
            minimumNights={listing.minimum_nights}
          />
        </div>
      </div>
    </main>
  );
}
