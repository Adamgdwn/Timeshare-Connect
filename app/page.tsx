import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/features/auth/components/SignOutButton";
import DestinationInput from "@/components/forms/DestinationInput";
import TravelerHotelPriceLookup from "@/features/pricing/components/TravelerHotelPriceLookup";
import { getDestinationSuggestions } from "@/lib/listings/getDestinationSuggestions";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const destinationSuggestions = await getDestinationSuggestions();

  return (
    <main className="tc-page mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <section className="tc-hero tc-fade-up rounded-3xl p-6 md:p-9">
        <div className="relative z-10 grid gap-6 md:grid-cols-5 md:items-end">
          <div className="md:col-span-3">
            <span className="tc-badge">Private Beta</span>
            <h1 className="tc-title mt-4 text-5xl font-semibold tracking-tight md:text-7xl">
              Designed to put luxury getaways within reach.
            </h1>
            <p className="tc-muted mt-4 max-w-2xl text-sm md:text-base">
              Aspirational visuals, clear pricing cues, and effortless navigation to reduce planning friction and
              increase travel confidence.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {!user ? (
                <Link className="tc-btn-primary rounded px-4 py-2 text-sm font-semibold" href="/login">
                  Start planning
                </Link>
              ) : (
                <SignOutButton />
              )}
              <Link className="tc-btn-secondary rounded px-4 py-2 text-sm font-semibold" href="/search">
                Explore destinations
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="tc-fade-up grid gap-3 md:grid-cols-3">
        <article className="tc-stat rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--tc-ink-soft)]">Escape Quality</p>
          <p className="tc-title mt-2 text-3xl font-semibold">Premium</p>
          <p className="tc-muted mt-1 text-sm">Resort-forward listings with high perceived value positioning.</p>
        </article>
        <article className="tc-stat rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--tc-ink-soft)]">Decision Speed</p>
          <p className="tc-title mt-2 text-3xl font-semibold">Fast</p>
          <p className="tc-muted mt-1 text-sm">Simplified search inputs and immediate alternatives for confidence.</p>
        </article>
        <article className="tc-stat rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--tc-ink-soft)]">Experience Mood</p>
          <p className="tc-title mt-2 text-3xl font-semibold">Aspirational</p>
          <p className="tc-muted mt-1 text-sm">Travel-first language that keeps focus on memorable stays.</p>
        </article>
      </section>

      <section className="tc-surface tc-fade-up rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="tc-title text-3xl font-semibold md:text-4xl">Find your next luxury week</h2>
          <span className="tc-muted text-xs">Traveler-first search and request flow</span>
        </div>
        <form action="/search" className="mt-4 grid gap-3 md:grid-cols-12 md:items-end" method="get">
          <div className="md:col-span-4">
            <DestinationInput inputId="home-destination" options={destinationSuggestions} />
          </div>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Check-in
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              id="home-check-in"
              name="checkIn"
              type="date"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Check-out
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              id="home-check-out"
              name="checkOut"
              type="date"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-700 md:col-span-2">
            Guests
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              id="home-guests"
              min={1}
              name="guests"
              placeholder="2"
              type="number"
            />
          </label>
          <div className="md:col-span-2">
            <button className="tc-btn-primary w-full rounded px-4 py-2 text-sm font-medium" type="submit">
              Search
            </button>
          </div>
        </form>
        <TravelerHotelPriceLookup
          checkInInputId="home-check-in"
          checkOutInputId="home-check-out"
          destinationInputId="home-destination"
          guestsInputId="home-guests"
        />

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--tc-border)] pt-4">
          <Link className="tc-btn-secondary rounded px-4 py-2 text-sm" href="/trips">
            My Trips
          </Link>
        </div>
      </section>

      <section className="tc-surface-soft rounded-2xl p-5">
        <h2 className="tc-title text-2xl font-semibold">Account</h2>
        <p className="tc-muted mt-1 text-sm">Log in once, then choose your view from the login dropdown.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!user ? (
            <Link className="tc-btn-primary rounded px-4 py-2 text-sm" href="/login">
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
