import OwnerListingForm from "@/features/listings/components/OwnerListingForm";

export default function NewOwnerListingPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Add Listing</h1>
      <p className="mt-3 text-sm text-zinc-600">Create a new week listing for travelers to discover.</p>
      <div className="mt-6">
        <OwnerListingForm />
      </div>
    </main>
  );
}
