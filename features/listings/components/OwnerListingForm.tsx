"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityCountryLookup from "@/components/forms/CityCountryLookup";

type ListingFormState = {
  selectedInventoryId: string;
  selectedResortPortalId: string;
  ownershipType: "fixed_week" | "floating_week" | "points";
  seasonOption: string;
  season: string;
  homeWeekOption: string;
  homeWeek: string;
  pointsPower: string;
  inventoryNotes: string;
  resortName: string;
  city: string;
  country: string;
  checkInDate: string;
  checkOutDate: string;
  unitTypeOption: string;
  unitType: string;
  ownerPrice: string;
  normalPrice: string;
  resortBookingUrl: string;
  description: string;
};

const initialState: ListingFormState = {
  selectedInventoryId: "",
  selectedResortPortalId: "",
  ownershipType: "fixed_week",
  seasonOption: "",
  season: "",
  homeWeekOption: "",
  homeWeek: "",
  pointsPower: "",
  inventoryNotes: "",
  resortName: "",
  city: "",
  country: "",
  checkInDate: "",
  checkOutDate: "",
  unitTypeOption: "",
  unitType: "",
  ownerPrice: "",
  normalPrice: "",
  resortBookingUrl: "",
  description: "",
};

type OwnerInventoryTemplate = {
  id: string;
  label: string;
  ownership_type: "fixed_week" | "floating_week" | "points";
  season: string | null;
  home_week: string | null;
  points_power: number | null;
  inventory_notes: string | null;
  resort_name: string;
  city: string;
  country: string | null;
  unit_type: string;
  resort_booking_url: string | null;
};

type ResortPortal = {
  id: string;
  resort_name: string;
  brand: string | null;
  booking_base_url: string;
  requires_login: boolean;
  supports_deeplink: boolean;
};

const UNIT_TYPE_OPTIONS = ["studio", "1 bedroom", "2 bedroom", "3 bedroom", "lockoff"];
const SEASON_OPTIONS = ["Platinum / Prime", "High season", "Shoulder season", "Low season", "Holiday season"];

function dollarsToCents(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100);
}

function resolveUnitTypeOption(value: string) {
  return UNIT_TYPE_OPTIONS.includes(value) ? value : value ? "custom" : "";
}

function resolveSeasonOption(value: string) {
  return SEASON_OPTIONS.includes(value) ? value : value ? "custom" : "";
}

function resolveHomeWeekOption(value: string) {
  const match = /^Week\s([1-9]|[1-4][0-9]|5[0-2])$/i.test(value.trim());
  return match ? value : value ? "custom" : "";
}

function findPortalIdByResortName(portals: ResortPortal[], resortName: string) {
  const normalized = resortName.trim().toLowerCase();
  if (!normalized) return "";

  const exact = portals.find((portal) => portal.resort_name.trim().toLowerCase() === normalized);
  if (exact) return exact.id;

  const partial = portals.find((portal) => normalized.includes(portal.resort_name.trim().toLowerCase()));
  return partial?.id ?? "";
}

export default function OwnerListingForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<ListingFormState>(initialState);
  const [inventoryTemplates, setInventoryTemplates] = useState<OwnerInventoryTemplate[]>([]);
  const [resortPortals, setResortPortals] = useState<ResortPortal[]>([]);
  const [autoNormalPrice, setAutoNormalPrice] = useState<number | null>(null);
  const [autoNormalPriceStatus, setAutoNormalPriceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [normalPriceEditedManually, setNormalPriceEditedManually] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplatesAndPortals() {
      const [templateResult, portalResult] = await Promise.all([
        supabase
          .from("owner_inventory")
          .select(
            "id,label,ownership_type,season,home_week,points_power,inventory_notes,resort_name,city,country,unit_type,resort_booking_url"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("resort_portals")
          .select("id,resort_name,brand,booking_base_url,requires_login,supports_deeplink")
          .order("resort_name", { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      if (!templateResult.error) {
        setInventoryTemplates((templateResult.data ?? []) as OwnerInventoryTemplate[]);
      }

      if (!portalResult.error) {
        setResortPortals((portalResult.data ?? []) as ResortPortal[]);
      }
    }

    loadTemplatesAndPortals();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!state.city || !state.checkInDate || !state.checkOutDate || state.checkOutDate <= state.checkInDate) {
      setAutoNormalPriceStatus("idle");
      setAutoNormalPrice(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setAutoNormalPriceStatus("loading");
      try {
        const response = await fetch("/api/hotel-pricing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            destination: state.city,
            resortName: state.resortName,
            country: state.country,
            checkIn: state.checkInDate,
            checkOut: state.checkOutDate,
            adults: 2,
          }),
        });

        const payload = (await response.json()) as {
          nightlyUsd?: number;
          totalUsd?: number;
          error?: string;
        };

        if (!response.ok || !payload.totalUsd) {
          throw new Error(payload.error || "No normal price found.");
        }

        setAutoNormalPrice(payload.totalUsd);
        setAutoNormalPriceStatus("ready");

        if (!normalPriceEditedManually || !state.normalPrice) {
          setState((s) => ({ ...s, normalPrice: String(payload.totalUsd) }));
        }
      } catch {
        setAutoNormalPriceStatus("error");
      }
    }, 650);

    return () => clearTimeout(timeout);
  }, [
    normalPriceEditedManually,
    state.checkInDate,
    state.checkOutDate,
    state.city,
    state.country,
    state.normalPrice,
    state.resortName,
  ]);

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

      const parsedPointsPower = Number(state.pointsPower);
      const pointsPower =
        state.ownershipType === "points"
          ? Number.isFinite(parsedPointsPower) && parsedPointsPower > 0
            ? Math.round(parsedPointsPower)
            : null
          : null;

      if (state.ownershipType === "points" && !pointsPower) {
        throw new Error("Points owners must provide a positive points power value.");
      }

      if (state.ownershipType === "floating_week" && !state.season.trim()) {
        throw new Error("Floating week owners should provide the available season.");
      }

      if (state.ownershipType === "fixed_week" && !state.homeWeek.trim()) {
        throw new Error("Fixed week owners should provide the owned week (for example, Week 32).");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in as an owner.");

      const { error: insertError } = await supabase.from("listings").insert({
        owner_id: user.id,
        inventory_id: state.selectedInventoryId || null,
        resort_portal_id: state.selectedResortPortalId || null,
        ownership_type: state.ownershipType,
        season: state.season || null,
        home_week: state.homeWeek || null,
        points_power: pointsPower,
        inventory_notes: state.inventoryNotes || null,
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
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Use saved inventory template</p>
          <Link className="text-xs underline" href="/inventory">
            Manage inventory library
          </Link>
        </div>
        <select
          className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          value={state.selectedInventoryId}
          onChange={(e) => {
            const templateId = e.target.value;
            const template = inventoryTemplates.find((item) => item.id === templateId);

            if (!template) {
              setNormalPriceEditedManually(false);
              setState((s) => ({ ...s, selectedInventoryId: "" }));
              return;
            }

            const homeWeek = template.home_week || "";
            const season = template.season || "";
            const unitType = template.unit_type || "";

            setState((s) => ({
              ...s,
              selectedInventoryId: template.id,
              selectedResortPortalId: findPortalIdByResortName(resortPortals, template.resort_name),
              ownershipType: template.ownership_type,
              seasonOption: resolveSeasonOption(season),
              season,
              homeWeekOption: resolveHomeWeekOption(homeWeek),
              homeWeek,
              pointsPower: template.points_power ? String(template.points_power) : "",
              inventoryNotes: template.inventory_notes || "",
              resortName: template.resort_name,
              city: template.city,
              country: template.country || "",
              unitTypeOption: resolveUnitTypeOption(unitType),
              unitType,
              resortBookingUrl: template.resort_booking_url || "",
            }));
            setNormalPriceEditedManually(false);
          }}
        >
          <option value="">No template (manual entry)</option>
          {inventoryTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label} - {template.resort_name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-zinc-600">
          Selecting a template auto-fills ownership/resort variables. Then just set week dates and pricing.
        </p>
      </div>

      <label className="block text-sm">
        Ownership type
        <select
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          value={state.ownershipType}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              ownershipType: e.target.value as ListingFormState["ownershipType"],
            }))
          }
        >
          <option value="fixed_week">Fixed week ownership</option>
          <option value="floating_week">Floating week ownership</option>
          <option value="points">Points ownership</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Season {state.ownershipType === "floating_week" ? "(required)" : "(optional)"}
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            required={state.ownershipType === "floating_week"}
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
            <option value="Platinum / Prime">Platinum / Prime</option>
            <option value="High season">High season</option>
            <option value="Shoulder season">Shoulder season</option>
            <option value="Low season">Low season</option>
            <option value="Holiday season">Holiday season</option>
            <option value="custom">Custom</option>
          </select>
          {state.seasonOption === "custom" ? (
            <input
              className="mt-2 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Enter custom season"
              required={state.ownershipType === "floating_week"}
              value={state.season}
              onChange={(e) => setState((s) => ({ ...s, season: e.target.value }))}
            />
          ) : null}
        </label>

        <label className="block text-sm">
          Home week {state.ownershipType === "fixed_week" ? "(required)" : "(optional)"}
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            required={state.ownershipType === "fixed_week"}
            value={state.homeWeekOption}
            onChange={(e) => {
              const value = e.target.value;
              setState((s) => ({
                ...s,
                homeWeekOption: value,
                homeWeek: value && value !== "custom" ? value : "",
              }));
            }}
          >
            <option value="">Select week</option>
            {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={`Week ${week}`}>
                Week {week}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          {state.homeWeekOption === "custom" ? (
            <input
              className="mt-2 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Enter custom week (e.g., Week 53 split stay)"
              required={state.ownershipType === "fixed_week"}
              value={state.homeWeek}
              onChange={(e) => setState((s) => ({ ...s, homeWeek: e.target.value }))}
            />
          ) : null}
        </label>
      </div>

      {state.ownershipType === "points" ? (
        <label className="block text-sm">
          Points power (required)
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            min="1"
            placeholder="120000"
            required
            step="1"
            type="number"
            value={state.pointsPower}
            onChange={(e) => setState((s) => ({ ...s, pointsPower: e.target.value }))}
          />
        </label>
      ) : null}

      <label className="block text-sm">
        Inventory notes
        <textarea
          className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="Guest certificate rules, blackout dates, booking windows, transfer notes..."
          value={state.inventoryNotes}
          onChange={(e) => setState((s) => ({ ...s, inventoryNotes: e.target.value }))}
        />
      </label>

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
        Resort booking portal (recommended)
        <select
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          value={state.selectedResortPortalId}
          onChange={(e) => {
            const selectedPortalId = e.target.value;
            const selectedPortal = resortPortals.find((portal) => portal.id === selectedPortalId);

            setState((s) => ({
              ...s,
              selectedResortPortalId: selectedPortalId,
              resortBookingUrl: selectedPortal?.booking_base_url ?? s.resortBookingUrl,
            }));
          }}
        >
          <option value="">Custom URL only (no portal selected)</option>
          {resortPortals.map((portal) => (
            <option key={portal.id} value={portal.id}>
              {portal.resort_name}
              {portal.brand ? ` (${portal.brand})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-600">
          Pick a known portal for cleaner traveler handoff. You can still override the booking URL below.
        </p>
      </label>

      <CityCountryLookup
        city={state.city}
        country={state.country}
        onCityChange={(value) => setState((s) => ({ ...s, city: value }))}
        onCountryChange={(value) => setState((s) => ({ ...s, country: value }))}
      />

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
        <select
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          required
          value={state.unitTypeOption}
          onChange={(e) => {
            const value = e.target.value;
            setState((s) => ({
              ...s,
              unitTypeOption: value,
              unitType: value && value !== "custom" ? value : "",
            }));
          }}
        >
          <option value="">Select unit type</option>
          <option value="studio">Studio</option>
          <option value="1 bedroom">1 bedroom</option>
          <option value="2 bedroom">2 bedroom</option>
          <option value="3 bedroom">3 bedroom</option>
          <option value="lockoff">Lockoff</option>
          <option value="custom">Custom</option>
        </select>
        {state.unitTypeOption === "custom" ? (
          <input
            className="mt-2 w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Enter custom unit type"
            required
            value={state.unitType}
            onChange={(e) => setState((s) => ({ ...s, unitType: e.target.value }))}
          />
        ) : null}
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
            onChange={(e) => {
              setNormalPriceEditedManually(true);
              setState((s) => ({ ...s, normalPrice: e.target.value }));
            }}
          />
          {autoNormalPriceStatus === "loading" ? (
            <p className="mt-1 text-xs text-zinc-600">Auto-checking normal hotel pricing...</p>
          ) : null}
          {autoNormalPriceStatus === "ready" && autoNormalPrice ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
              <span>Auto estimate: ${autoNormalPrice.toLocaleString("en-US")} total stay.</span>
              <button
                className="rounded border border-zinc-300 px-2 py-0.5 text-xs"
                onClick={() => {
                  setNormalPriceEditedManually(false);
                  setState((s) => ({ ...s, normalPrice: String(autoNormalPrice) }));
                }}
                type="button"
              >
                Use estimate
              </button>
            </div>
          ) : null}
          {autoNormalPriceStatus === "error" ? (
            <p className="mt-1 text-xs text-amber-700">Could not auto-fetch normal hotel price. Enter it manually.</p>
          ) : null}
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
