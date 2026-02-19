import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Timeshare Connect</h1>
      <p className="mt-3 text-sm text-zinc-600">Book timeshare weeks with a simple request, accept, and step-by-step flow.</p>

      <section className="mt-6 rounded border border-zinc-200 p-4">
        <h2 className="text-base font-semibold">Traveler Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded bg-zinc-900 px-4 py-2 text-sm text-white" href="/search">
            Search Listings
          </Link>
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
