"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ListingFormState = {
  resortName: string;
  city: string;
  country: string;
  checkInDate: string;
  checkOutDate: string;
  unitType: string;
  ownerPrice: string;
  normalPrice: string;
  resortBookingUrl: string;
  description: string;
};

const initialState: ListingFormState = {
  resortName: "",
  city: "",
  country: "",
  checkInDate: "",
  checkOutDate: "",
  unitType: "",
  ownerPrice: "",
  normalPrice: "",
  resortBookingUrl: "",
  description: "",
};

function dollarsToCents(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100);
}

export default function OwnerListingForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<ListingFormState>(initialState);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const ownerPriceCents = dollarsToCents(state.ownerPrice);
      const normalPriceCents = dollarsToCents(state.normalPrice);

      if (!ownerPriceCents || !normalPriceCents) {
        throw new Error("Owner price and normal price must be positive numbers.");
      }

      if (!state.checkInDate || !state.checkOutDate || state.checkOutDate <= state.checkInDate) {
        throw new Error("Check-out date must be after check-in date.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in as an owner.");

      const { error: insertError } = await supabase.from("listings").insert({
        owner_id: user.id,
        resort_name: state.resortName,
        city: state.city,
        country: state.country || null,
        check_in_date: state.checkInDate,
        check_out_date: state.checkOutDate,
        unit_type: state.unitType,
        owner_price_cents: ownerPriceCents,
        normal_price_cents: normalPriceCents,
        resort_booking_url: state.resortBookingUrl || null,
        description: state.description || null,
        is_active: true,
      });

      if (insertError) throw insertError;

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded border border-zinc-200 p-4" onSubmit={handleSubmit}>
      <label className="block text-sm">
        Resort name
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          required
          value={state.resortName}
          onChange={(e) => setState((s) => ({ ...s, resortName: e.target.value }))}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          City
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            required
            value={state.city}
            onChange={(e) => setState((s) => ({ ...s, city: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          Country
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={state.country}
            onChange={(e) => setState((s) => ({ ...s, country: e.target.value }))}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Check-in date
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="date"
            required
            value={state.checkInDate}
            onChange={(e) => setState((s) => ({ ...s, checkInDate: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          Check-out date
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="date"
            required
            value={state.checkOutDate}
            onChange={(e) => setState((s) => ({ ...s, checkOutDate: e.target.value }))}
          />
        </label>
      </div>

      <label className="block text-sm">
        Unit type
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="studio, 1 bedroom, 2 bedroom..."
          required
          value={state.unitType}
          onChange={(e) => setState((s) => ({ ...s, unitType: e.target.value }))}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Owner price (USD)
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="number"
            min="1"
            step="0.01"
            required
            value={state.ownerPrice}
            onChange={(e) => setState((s) => ({ ...s, ownerPrice: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          Normal hotel price (USD)
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="number"
            min="1"
            step="0.01"
            required
            value={state.normalPrice}
            onChange={(e) => setState((s) => ({ ...s, normalPrice: e.target.value }))}
          />
        </label>
      </div>

      <label className="block text-sm">
        Resort booking URL
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="https://..."
          value={state.resortBookingUrl}
          onChange={(e) => setState((s) => ({ ...s, resortBookingUrl: e.target.value }))}
        />
      </label>

      <label className="block text-sm">
        Description
        <textarea
          className="mt-1 min-h-24 w-full rounded border border-zinc-300 px-3 py-2"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
        />
      </label>

      <button
        className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Save listing"}
      </button>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
