import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import AdminBookingActions from "@/features/bookings/components/AdminBookingActions";
import SignOutButton from "@/features/auth/components/SignOutButton";
import { calculatePayoutBreakdown } from "@/lib/pricing";
import AdminUserActions from "@/features/admin/components/AdminUserActions";

type BookingRow = {
  id: string;
  status: string;
  created_at: string;
  confirmation_number: string | null;
  proof_file_path: string | null;
  cancel_reason: string | null;
  canceled_at: string | null;
  traveler: { full_name: string | null } | null;
  owner: { full_name: string | null } | null;
  listings: {
    resort_name: string;
    city: string;
    owner_price_cents: number;
  };
};

type UserRow = {
  id: string;
  role: "traveler" | "owner" | "both" | "admin";
  account_status: "active" | "on_hold" | "banned";
  status_reason: string | null;
  full_name: string | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (params.status || "").trim();

  const supabase = await createServerClient();
  const selectWithCancelFields =
    "id,status,created_at,confirmation_number,proof_file_path,cancel_reason,canceled_at,listings!inner(resort_name,city,owner_price_cents),traveler:profiles!bookings_traveler_id_fkey(full_name),owner:profiles!bookings_owner_id_fkey(full_name)";
  const selectWithoutCancelFields =
    "id,status,created_at,confirmation_number,proof_file_path,listings!inner(resort_name,city,owner_price_cents),traveler:profiles!bookings_traveler_id_fkey(full_name),owner:profiles!bookings_owner_id_fkey(full_name)";

  let query = supabase.from("bookings").select(selectWithCancelFields).order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);
  let { data, error } = await query;

  if (error && /cancel_reason|canceled_at/i.test(error.message || "")) {
    let retryQuery = supabase.from("bookings").select(selectWithoutCancelFields).order("created_at", { ascending: false });
    if (statusFilter) retryQuery = retryQuery.eq("status", statusFilter);
    const retry = await retryQuery;
    error = retry.error;
    data = (retry.data ?? []).map((row) => ({
      ...row,
      cancel_reason: null,
      canceled_at: null,
    }));
  }

  const bookings = (data ?? []) as unknown as BookingRow[];

  const { data: usersData } = await supabase
    .from("profiles")
    .select("id,role,account_status,status_reason,full_name")
    .order("created_at", { ascending: false })
    .limit(100);
  const users = (usersData ?? []) as UserRow[];

  const userIds = users.map((u) => u.id);
  const ratingByUserId = new Map<string, { avg: number; count: number }>();
  if (userIds.length > 0) {
    const { data: reviews } = await supabase.from("user_reviews").select("reviewed_user_id,rating").in("reviewed_user_id", userIds);
    const buckets = new Map<string, { total: number; count: number }>();
    (reviews ?? []).forEach((review) => {
      const curr = buckets.get(review.reviewed_user_id) ?? { total: 0, count: 0 };
      curr.total += review.rating;
      curr.count += 1;
      buckets.set(review.reviewed_user_id, curr);
    });
    buckets.forEach((value, key) => {
      ratingByUserId.set(key, { avg: value.total / value.count, count: value.count });
    });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const bookingsThisMonth = bookings.filter((b) => b.created_at >= monthStart).length;
  const pendingVerifications = bookings.filter((b) => b.status === "owner_booked_pending_verification").length;
  const totalVolumeCents = bookings
    .filter((b) => b.status !== "canceled" && b.status !== "refunded")
    .reduce((sum, booking) => sum + (booking.listings?.owner_price_cents || 0), 0);
  const totalPlatformFeesCents = bookings
    .filter((b) => b.status !== "canceled" && b.status !== "refunded")
    .reduce((sum, booking) => sum + calculatePayoutBreakdown(booking.listings?.owner_price_cents || 0).platformFeeCents, 0);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link className="rounded border border-zinc-300 px-3 py-2 text-sm" href="/search">
            Public search
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Bookings This Month</p>
          <p className="mt-1 text-2xl font-semibold">{bookingsThisMonth}</p>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Volume</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(totalVolumeCents)}</p>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Verifications</p>
          <p className="mt-1 text-2xl font-semibold">{pendingVerifications}</p>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Platform Fees (5%)</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(totalPlatformFeesCents)}</p>
        </div>
      </div>

      <form className="mt-6 flex items-end gap-3 rounded border border-zinc-200 p-4" method="get">
        <label className="block text-sm">
          Filter by status
          <select className="mt-1 rounded border border-zinc-300 px-3 py-2" defaultValue={statusFilter} name="status">
            <option value="">All</option>
            <option value="requested">requested</option>
            <option value="awaiting_first_payment">awaiting_first_payment</option>
            <option value="first_payment_paid">first_payment_paid</option>
            <option value="owner_booked_pending_verification">owner_booked_pending_verification</option>
            <option value="verified_awaiting_final_payment">verified_awaiting_final_payment</option>
            <option value="fully_paid">fully_paid</option>
            <option value="canceled">canceled</option>
            <option value="refunded">refunded</option>
          </select>
        </label>
        <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white" type="submit">
          Apply
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-700">Failed to load bookings: {error.message}</p> : null}

      {!error && bookings.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No bookings found for this filter.</p>
      ) : null}

      {bookings.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Traveler</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Fee / Net</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr className="border-t border-zinc-200 align-top" key={booking.id}>
                  <td className="px-4 py-3">{booking.traveler?.full_name || "Traveler"}</td>
                  <td className="px-4 py-3">{booking.owner?.full_name || "Owner"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{booking.listings.resort_name}</div>
                    <div className="text-zinc-600">{booking.listings.city}</div>
                    <div className="text-zinc-500">{formatMoney(booking.listings.owner_price_cents)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>Fee: {formatMoney(calculatePayoutBreakdown(booking.listings.owner_price_cents).platformFeeCents)}</div>
                    <div className="text-zinc-600">
                      Net: {formatMoney(calculatePayoutBreakdown(booking.listings.owner_price_cents).ownerNetCents)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{booking.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">
                    {booking.proof_file_path ? (
                      <a
                        className="underline"
                        href={booking.proof_file_path}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View proof
                      </a>
                    ) : (
                      "No proof"
                    )}
                    {booking.confirmation_number ? (
                      <div className="mt-1 text-xs text-zinc-600">Conf #: {booking.confirmation_number}</div>
                    ) : null}
                    {booking.cancel_reason ? (
                      <div className="mt-1 text-xs text-zinc-600">Cancel reason: {booking.cancel_reason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBookingActions bookingId={booking.id} currentStatus={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">User Moderation</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No users found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-700">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const rating = ratingByUserId.get(user.id);
                  return (
                    <tr className="border-t border-zinc-200 align-top" key={user.id}>
                      <td className="px-4 py-3">
                        <div>{user.full_name || "Unnamed user"}</div>
                        <div className="text-xs text-zinc-500">{user.id}</div>
                      </td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">{user.account_status}</td>
                      <td className="px-4 py-3">
                        {rating ? `${rating.avg.toFixed(1)} (${rating.count})` : "No ratings"}
                      </td>
                      <td className="px-4 py-3">{user.status_reason || "-"}</td>
                      <td className="px-4 py-3">
                        <AdminUserActions currentStatus={user.account_status} userId={user.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
