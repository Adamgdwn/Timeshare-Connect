import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-8">
      <h1 className="text-3xl font-semibold">Timeshare Connect</h1>
      <p className="mt-2 text-sm text-zinc-600">Search timeshare stays by destination, dates, and value.</p>

      <section className="mt-6 rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">Search Stays</h2>
        <form action="/search" className="mt-4 grid gap-3 md:grid-cols-12 md:items-end" method="get">
          <label className="block text-xs font-medium text-zinc-700 md:col-span-4">
            Destination or resort
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              name="q"
              placeholder="Orlando, Maui, Marriott..."
            />
          </label>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Check-in
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" name="checkIn" type="date" />
          </label>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Check-out
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" name="checkOut" type="date" />
          </label>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Guests
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm" min={1} name="guests" placeholder="2" type="number" />
          </label>
          <div className="md:col-span-2">
            <button className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white" type="submit">
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
          <Link className="rounded border border-zinc-300 px-4 py-2 text-sm" href="/trips">
            My Trips
          </Link>
          {!user ? (
            <Link className="rounded border border-zinc-300 px-4 py-2 text-sm" href="/login">
              Log in / Sign up
            </Link>
          ) : (
            <SignOutButton />
          )}
        </div>
      </section>
    </main>
  );
}
