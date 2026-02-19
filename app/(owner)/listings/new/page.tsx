import OwnerListingForm from "@/features/listings/components/OwnerListingForm";
import OwnerWorkspaceNav from "@/features/owner/components/OwnerWorkspaceNav";

export default function NewOwnerListingPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Add Listing</h1>
        <OwnerWorkspaceNav current="new-listing" />
      </div>
      <p className="mt-3 text-sm text-zinc-600">
        Create a new week listing for travelers. Use inventory templates to prefill resort ownership details.
      </p>
      <div className="mt-6">
        <OwnerListingForm />
      </div>
    </main>
  );
}
