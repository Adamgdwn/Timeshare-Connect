import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import ShareListingButton from "@/features/listings/components/ShareListingButton";
import RequestWeekForm from "@/features/offers/components/RequestWeekForm";

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
      "id,owner_id,resort_name,city,country,check_in_date,check_out_date,unit_type,owner_price_cents,normal_price_cents,resort_booking_url,description,is_active,resort_portals(id,resort_name,brand,booking_base_url,requires_login,supports_deeplink,notes)"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing || !listing.is_active) {
    notFound();
  }

  const resortPortal =
    !listing.resort_portals || Array.isArray(listing.resort_portals)
      ? null
      : listing.resort_portals;
  const bookingLink = listing.resort_booking_url || resortPortal?.booking_base_url || null;

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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">{listing.resort_name}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {listing.city}
        {listing.country ? `, ${listing.country}` : ""}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p>
              <span className="font-medium">Dates:</span> {listing.check_in_date} to {listing.check_out_date}
            </p>
            <p>
              <span className="font-medium">Unit type:</span> {listing.unit_type}
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

          {listing.description ? <p className="text-sm text-zinc-700">{listing.description}</p> : null}

          <div className="flex flex-wrap gap-2">
            {bookingLink ? (
              <a
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
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
          <RequestWeekForm listingId={listing.id} />
        </div>
      </div>
    </main>
  );
}
