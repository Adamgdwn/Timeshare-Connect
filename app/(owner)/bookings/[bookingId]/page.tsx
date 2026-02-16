export default async function OwnerBookingProgressPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Booking Progress</h1>
      <p className="mt-3 text-sm text-zinc-600">Placeholder for booking workflow and proof upload for booking {bookingId}.</p>
    </main>
  );
}
