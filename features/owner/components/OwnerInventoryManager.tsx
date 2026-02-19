"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityCountryLookup from "@/components/forms/CityCountryLookup";

type OwnerInventoryItem = {
  id: string;
  label: string;
  resort_name: string;
  city: string;
  country: string | null;
  ownership_type: "fixed_week" | "floating_week" | "points";
  season: string | null;
  home_week: string | null;
  points_power: number | null;
  inventory_notes: string | null;
  unit_type: string;
  resort_booking_url: string | null;
};

type OwnerInventoryManagerProps = {
  items: OwnerInventoryItem[];
};

type FormState = {
  label: string;
  resortName: string;
  city: string;
  country: string;
  ownershipType: "fixed_week" | "floating_week" | "points";
  seasonOption: string;
  season: string;
  homeWeek: string;
  pointsPower: string;
  inventoryNotes: string;
  unitType: string;
  resortBookingUrl: string;
};

const initialState: FormState = {
  label: "",
  resortName: "",
  city: "",
  country: "",
  ownershipType: "fixed_week",
  seasonOption: "",
  season: "",
  homeWeek: "",
  pointsPower: "",
  inventoryNotes: "",
  unitType: "",
  resortBookingUrl: "",
};

const SEASON_OPTIONS = ["Platinum / Prime", "High season", "Shoulder season", "Low season", "Holiday season"];

export default function OwnerInventoryManager({ items }: OwnerInventoryManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in.");

      const parsedPoints = Number(state.pointsPower);
      const pointsPower =
        state.ownershipType === "points"
          ? Number.isFinite(parsedPoints) && parsedPoints > 0
            ? Math.round(parsedPoints)
            : null
          : null;

      if (state.ownershipType === "points" && !pointsPower) {
        throw new Error("Points power must be a positive value for points ownership.");
      }

      const { error } = await supabase.from("owner_inventory").insert({
        owner_id: user.id,
        label: state.label,
        resort_name: state.resortName,
        city: state.city,
        country: state.country || null,
        ownership_type: state.ownershipType,
        season: state.season || null,
        home_week: state.homeWeek || null,
        points_power: pointsPower,
        inventory_notes: state.inventoryNotes || null,
        unit_type: state.unitType,
        resort_booking_url: state.resortBookingUrl || null,
      });

      if (error) throw error;

      setState(initialState);
      setMessage("Inventory template saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save inventory template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setMessage("");
    setDeletingId(id);
    try {
      const { error } = await supabase.from("owner_inventory").delete().eq("id", id);
      if (error) throw error;
      setMessage("Inventory template deleted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4 rounded border border-zinc-200 p-4" onSubmit={handleCreate}>
        <h2 className="text-base font-semibold">Save Resort Template</h2>
        <p className="text-xs text-zinc-600">
          Save this once, then reuse it when creating weekly listings.
        </p>

        <label className="block text-sm">
          Template name
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Maui Ocean Club - 2BR Platinum"
            required
            value={state.label}
            onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Resort name
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              required
              value={state.resortName}
              onChange={(e) => setState((s) => ({ ...s, resortName: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Unit type
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="2 bedroom"
              required
              value={state.unitType}
              onChange={(e) => setState((s) => ({ ...s, unitType: e.target.value }))}
            />
          </label>
        </div>

        <CityCountryLookup
          city={state.city}
          country={state.country}
          onCityChange={(value) => setState((s) => ({ ...s, city: value }))}
          onCountryChange={(value) => setState((s) => ({ ...s, country: value }))}
        />

        <label className="block text-sm">
          Ownership type
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={state.ownershipType}
            onChange={(e) =>
              setState((s) => ({ ...s, ownershipType: e.target.value as FormState["ownershipType"] }))
            }
          >
            <option value="fixed_week">Fixed week</option>
            <option value="floating_week">Floating week</option>
            <option value="points">Points</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            Season
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              value={state.seasonOption}
              onChange={(e) => {
                const value = e.target.value;
                setState((s) => ({
                  ...s,
                  seasonOption: value,
                  season: value && value !== "custom" ? value : "",
                }));
              }}
            >
              <option value="">Select season</option>
              {SEASON_OPTIONS.map((seasonValue) => (
                <option key={seasonValue} value={seasonValue}>
                  {seasonValue}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
            {state.seasonOption === "custom" ? (
              <input
                className="mt-2 w-full rounded border border-zinc-300 px-3 py-2"
                placeholder="Enter custom season"
                value={state.season}
                onChange={(e) => setState((s) => ({ ...s, season: e.target.value }))}
              />
            ) : null}
          </label>
          <label className="block text-sm">
            Home week
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Week 32"
              value={state.homeWeek}
              onChange={(e) => setState((s) => ({ ...s, homeWeek: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Points power
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              min="1"
              placeholder="120000"
              step="1"
              type="number"
              value={state.pointsPower}
              onChange={(e) => setState((s) => ({ ...s, pointsPower: e.target.value }))}
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
          Inventory notes
          <textarea
            className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Guest certificate rules, transfer notes, blackout dates..."
            value={state.inventoryNotes}
            onChange={(e) => setState((s) => ({ ...s, inventoryNotes: e.target.value }))}
          />
        </label>

        <button
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save template"}
        </button>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="text-base font-semibold">Saved Inventory Templates</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No templates yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Template</th>
                  <th className="px-3 py-2 font-medium">Resort</th>
                  <th className="px-3 py-2 font-medium">Ownership</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-zinc-200" key={item.id}>
                    <td className="px-3 py-2">{item.label}</td>
                    <td className="px-3 py-2">
                      <div>{item.resort_name}</div>
                      <div className="text-xs text-zinc-600">
                        {item.city}
                        {item.country ? `, ${item.country}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {item.ownership_type.replaceAll("_", " ")}
                      {item.home_week ? <div className="text-xs text-zinc-600">{item.home_week}</div> : null}
                      {item.season ? <div className="text-xs text-zinc-600">{item.season}</div> : null}
                      {item.points_power ? (
                        <div className="text-xs text-zinc-600">{item.points_power.toLocaleString()} pts</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{item.unit_type}</td>
                    <td className="px-3 py-2">
                      <button
                        className="rounded border border-zinc-300 px-2 py-1 text-xs"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        type="button"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
