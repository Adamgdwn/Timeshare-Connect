export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Listing Details</h1>
      <p className="mt-3 text-sm text-zinc-600">Placeholder for listing {listingId}.</p>
    </main>
  );
}
