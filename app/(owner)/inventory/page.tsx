import SignOutButton from "@/features/auth/components/SignOutButton";
import OwnerWorkspaceNav from "@/features/owner/components/OwnerWorkspaceNav";
import OwnerInventoryManager from "@/features/owner/components/OwnerInventoryManager";
import { createServerClient } from "@/lib/supabase/server";

export default async function OwnerInventoryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <h1 className="text-2xl font-semibold">Owner Inventory</h1>
        <p className="mt-3 text-sm text-zinc-600">You need to log in first.</p>
      </main>
    );
  }

  const { data: items, error } = await supabase
    .from("owner_inventory")
    .select(
      "id,label,resort_name,city,country,ownership_type,season,home_week,points_power,inventory_notes,unit_type,resort_booking_url,created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const inventoryTableMissing = !!error?.message && /owner_inventory/i.test(error.message);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Owner Inventory</h1>
        <div className="flex items-center gap-2">
          <OwnerWorkspaceNav current="inventory" />
          <SignOutButton />
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-600">
        Save reusable resort ownership templates. Then create listings by changing week and pricing only.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">Failed to load inventory: {error.message}</p> : null}
      {inventoryTableMissing ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Inventory table is missing. Run `supabase/owner_inventory_migration.sql` and then re-run `supabase/rls.sql`.
        </p>
      ) : null}

      <div className="mt-6">
        <OwnerInventoryManager items={items ?? []} />
      </div>
    </main>
  );
}
