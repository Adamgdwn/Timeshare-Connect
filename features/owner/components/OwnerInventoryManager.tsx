"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityCountryLookup from "@/components/forms/CityCountryLookup";
import ListingPhotoManager from "@/features/listings/components/ListingPhotoManager";
import {
  createExternalPhotoAsset,
  serializePhotoAssets,
  type ListingPhotoAsset,
} from "@/lib/listings/media";
import {
  AMENITY_OPTIONS,
  findResortCatalogMatches,
  getResortCatalogByKey,
  type AmenityOption,
  type ResortCatalogItem,
} from "@/lib/listings/resortCatalog";
import { formatAmenityLabel, getOwnershipCopy, toggleAmenity } from "@/lib/listings/metadata";

type OwnerInventoryItem = {
  id: string;
  label: string;
  resort_key: string | null;
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
  description_template: string | null;
  amenities: string[] | null;
  photo_urls: string[] | null;
  photo_storage_paths?: string[] | null;
};

type OwnerInventoryManagerProps = {
  items: OwnerInventoryItem[];
};

type FormState = {
  label: string;
  resortSearch: string;
  resortKey: string;
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
  descriptionTemplate: string;
  amenities: AmenityOption[];
  photos: ListingPhotoAsset[];
};

const initialState: FormState = {
  label: "",
  resortSearch: "",
  resortKey: "",
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
  descriptionTemplate: "",
  amenities: [],
  photos: [],
};

const SEASON_OPTIONS = ["Platinum / Prime", "High season", "Shoulder season", "Low season", "Holiday season"];

function applyCatalogSelection(current: FormState, resort: ResortCatalogItem): FormState {
  return {
    ...current,
    resortSearch: resort.name,
    resortKey: resort.key,
    resortName: resort.name,
    city: resort.city,
    country: resort.country,
    resortBookingUrl: resort.bookingBaseUrl ?? current.resortBookingUrl,
    descriptionTemplate: current.descriptionTemplate || resort.defaultDescription,
    amenities: resort.amenities,
    photos: resort.photos.map(createExternalPhotoAsset),
    unitType: current.unitType || resort.defaultUnitTypes[0] || "",
  };
}

export default function OwnerInventoryManager({ items }: OwnerInventoryManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resortMatches = useMemo(
    () => findResortCatalogMatches(state.resortSearch || state.resortName, 5),
    [state.resortName, state.resortSearch]
  );

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

      const { photoUrls, photoStoragePaths } = serializePhotoAssets(state.photos);

      const { error } = await supabase.from("owner_inventory").insert({
        owner_id: user.id,
        label: state.label,
        resort_key: state.resortKey || null,
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
        description_template: state.descriptionTemplate || null,
        amenities: state.amenities,
        photo_urls: photoUrls,
        photo_storage_paths: photoStoragePaths,
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
      <form className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" onSubmit={handleCreate}>
        <div>
          <h2 className="text-base font-semibold">Save Resort Template</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Save the resort once, then future listings only need dates and pricing.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <label className="block text-sm font-medium">
            Smart resort lookup
            <input
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
              placeholder="Start typing a resort name"
              value={state.resortSearch}
              onChange={(e) => setState((current) => ({ ...current, resortSearch: e.target.value, resortName: e.target.value }))}
            />
          </label>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {resortMatches.map((resort) => (
              <button
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-400"
                key={resort.key}
                type="button"
                onClick={() => setState((current) => applyCatalogSelection(current, resort))}
              >
                <img
                  alt={resort.name}
                  className="h-14 w-20 rounded-lg object-cover"
                  src={resort.photos[0]}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{resort.name}</span>
                  <span className="block text-xs text-zinc-600">
                    {resort.city}, {resort.country}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          Template name
          <input
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
            placeholder="Maui Ocean Club - 2BR Platinum"
            required
            value={state.label}
            onChange={(e) => setState((current) => ({ ...current, label: e.target.value }))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Resort name
            <input
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
              required
              value={state.resortName}
              onChange={(e) => setState((current) => ({ ...current, resortName: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Unit type
            <input
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="2 bedroom"
              required
              value={state.unitType}
              onChange={(e) => setState((current) => ({ ...current, unitType: e.target.value }))}
            />
          </label>
        </div>

        <CityCountryLookup
          city={state.city}
          country={state.country}
          onCityChange={(value) => setState((current) => ({ ...current, city: value }))}
          onCountryChange={(value) => setState((current) => ({ ...current, country: value }))}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Ownership type</p>
          <div className="grid gap-3 md:grid-cols-3">
            {(["fixed_week", "floating_week", "points"] as const).map((value) => {
              const copy = getOwnershipCopy(value);
              const isSelected = state.ownershipType === value;
              return (
                <button
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                  key={value}
                  type="button"
                  onClick={() => setState((current) => ({ ...current, ownershipType: value }))}
                >
                  <span className="block text-sm font-semibold">{copy.label}</span>
                  <span className={`mt-1 block text-xs ${isSelected ? "text-zinc-200" : "text-zinc-600"}`}>{copy.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            Season
            <select
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
              value={state.seasonOption}
              onChange={(e) => {
                const value = e.target.value;
                setState((current) => ({
                  ...current,
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
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Enter custom season"
                value={state.season}
                onChange={(e) => setState((current) => ({ ...current, season: e.target.value }))}
              />
            ) : null}
          </label>
          <label className="block text-sm">
            Home week
            <input
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="Week 32"
              value={state.homeWeek}
              onChange={(e) => setState((current) => ({ ...current, homeWeek: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Points power
            <input
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
              min="1"
              placeholder="120000"
              step="1"
              type="number"
              value={state.pointsPower}
              onChange={(e) => setState((current) => ({ ...current, pointsPower: e.target.value }))}
            />
          </label>
        </div>

        <label className="block text-sm">
          Resort booking URL
          <input
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
            placeholder="https://..."
            value={state.resortBookingUrl}
            onChange={(e) => setState((current) => ({ ...current, resortBookingUrl: e.target.value }))}
          />
        </label>

        <label className="block text-sm">
          Description template
          <textarea
            className="mt-1 min-h-24 w-full rounded-xl border border-zinc-300 px-3 py-2"
            placeholder="This will prefill new listings for this resort."
            value={state.descriptionTemplate}
            onChange={(e) => setState((current) => ({ ...current, descriptionTemplate: e.target.value }))}
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Amenity tags</p>
            <p className="text-xs text-zinc-600">{state.amenities.length} selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((amenity) => {
              const isSelected = state.amenities.includes(amenity);
              return (
                <button
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    isSelected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white hover:border-zinc-500"
                  }`}
                  key={amenity}
                  type="button"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      amenities: toggleAmenity(current.amenities, amenity),
                    }))
                  }
                >
                  {formatAmenityLabel(amenity)}
                </button>
              );
            })}
          </div>
        </div>

        <ListingPhotoManager
          helperText="Recognized resorts can preload these. Upload your own unit photos or add hosted URLs."
          minimumCount={3}
          onChange={(photos) => setState((current) => ({ ...current, photos }))}
          photos={state.photos}
          scope="inventory"
          title="Template photos"
        />

        <label className="block text-sm">
          Inventory notes
          <textarea
            className="mt-1 min-h-20 w-full rounded-xl border border-zinc-300 px-3 py-2"
            placeholder="Guest certificate rules, transfer notes, blackout dates..."
            value={state.inventoryNotes}
            onChange={(e) => setState((current) => ({ ...current, inventoryNotes: e.target.value }))}
          />
        </label>

        <button
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save template"}
        </button>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Saved Inventory Templates</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No templates yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {items.map((item) => {
              const catalogResort = item.resort_key ? getResortCatalogByKey(item.resort_key) : null;
              const photo = item.photo_urls?.[0] || catalogResort?.photos[0] || "";
              return (
                <article className="overflow-hidden rounded-2xl border border-zinc-200" key={item.id}>
                  {photo ? <img alt={item.resort_name} className="h-40 w-full object-cover" src={photo} /> : null}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-lg font-semibold">{item.resort_name}</p>
                        <p className="text-sm text-zinc-600">
                          {item.city}
                          {item.country ? `, ${item.country}` : ""}
                        </p>
                      </div>
                      <button
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        type="button"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-zinc-700">
                      <span className="rounded-full bg-zinc-100 px-2 py-1">{item.unit_type}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        {getOwnershipCopy(item.ownership_type).label}
                      </span>
                      {item.home_week ? <span className="rounded-full bg-zinc-100 px-2 py-1">{item.home_week}</span> : null}
                      {item.season ? <span className="rounded-full bg-zinc-100 px-2 py-1">{item.season}</span> : null}
                      {item.points_power ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1">{item.points_power.toLocaleString()} pts</span>
                      ) : null}
                    </div>

                    {item.description_template ? (
                      <p className="text-sm text-zinc-700">{item.description_template}</p>
                    ) : null}

                    {item.amenities && item.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.amenities.slice(0, 6).map((amenity) => (
                          <span className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-700" key={amenity}>
                            {formatAmenityLabel(amenity)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
