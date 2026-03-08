"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityCountryLookup from "@/components/forms/CityCountryLookup";
import { calculatePayoutBreakdown } from "@/lib/pricing";

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
  photoLinks: string;
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
  photoLinks: "",
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
const WIZARD_STEPS = ["Your Resort", "Your Week/Unit", "Pricing", "Review & Publish"];

function dollarsToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function resolveUnitTypeOption(value: string) {
  return UNIT_TYPE_OPTIONS.includes(value) ? value : value ? "custom" : "";
}

function resolveSeasonOption(value: string) {
  return SEASON_OPTIONS.includes(value) ? value : value ? "custom" : "";
}

function resolveHomeWeekOption(value: string) {
  return /^Week\s([1-9]|[1-4][0-9]|5[0-2])$/i.test(value.trim()) ? value : value ? "custom" : "";
}

function findPortalIdByResortName(portals: ResortPortal[], resortName: string) {
  const normalized = resortName.trim().toLowerCase();
  if (!normalized) return "";
  const exact = portals.find((p) => p.resort_name.trim().toLowerCase() === normalized);
  if (exact) return exact.id;
  return portals.find((p) => normalized.includes(p.resort_name.trim().toLowerCase()))?.id ?? "";
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
  const [currentStep, setCurrentStep] = useState(1);

  const ownerPriceCents = dollarsToCents(state.ownerPrice) ?? 0;
  const normalPriceCents = dollarsToCents(state.normalPrice) ?? 0;
  const payout = calculatePayoutBreakdown(ownerPriceCents);
  const estimatedSavingsCents = Math.max(0, normalPriceCents - ownerPriceCents);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const [templateResult, portalResult] = await Promise.all([
        supabase
          .from("owner_inventory")
          .select("id,label,ownership_type,season,home_week,points_power,inventory_notes,resort_name,city,country,unit_type,resort_booking_url")
          .order("created_at", { ascending: false }),
        supabase
          .from("resort_portals")
          .select("id,resort_name,brand,booking_base_url,requires_login,supports_deeplink")
          .order("resort_name", { ascending: true }),
      ]);
      if (!isMounted) return;
      if (!templateResult.error) setInventoryTemplates((templateResult.data ?? []) as OwnerInventoryTemplate[]);
      if (!portalResult.error) setResortPortals((portalResult.data ?? []) as ResortPortal[]);
    }
    loadData();
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
        const payload = (await response.json()) as { totalUsd?: number; error?: string };
        if (!response.ok || !payload.totalUsd) throw new Error(payload.error || "No normal price found.");
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
  }, [normalPriceEditedManually, state.checkInDate, state.checkOutDate, state.city, state.country, state.normalPrice, state.resortName]);

  function validateStep(step: number) {
    if (step === 1) {
      if (!state.resortName.trim()) return "Resort name is required.";
      if (!state.city.trim()) return "City is required.";
    }
    if (step === 2) {
      if (!state.checkInDate || !state.checkOutDate) return "Check-in and check-out dates are required.";
      if (state.checkOutDate <= state.checkInDate) return "Check-out date must be after check-in date.";
      if (!state.unitType.trim()) return "Unit type is required.";
      if (state.ownershipType === "floating_week" && !state.season.trim()) return "Floating week owners should provide the available season.";
      if (state.ownershipType === "fixed_week" && !state.homeWeek.trim()) return "Fixed week owners should provide the owned week (for example, Week 32).";
      const parsedPoints = Number(state.pointsPower);
      if (state.ownershipType === "points" && !(Number.isFinite(parsedPoints) && parsedPoints > 0)) return "Points owners must provide a positive points power value.";
    }
    if (step === 3 && (!dollarsToCents(state.ownerPrice) || !dollarsToCents(state.normalPrice))) {
      return "Owner price and normal price must be positive numbers.";
    }
    return "";
  }

  function handleNext() {
    setMessage("");
    const error = validateStep(currentStep);
    if (error) return setMessage(error);
    setCurrentStep((s) => Math.min(WIZARD_STEPS.length, s + 1));
  }

  function handleBack() {
    setMessage("");
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const stepError = validateStep(currentStep);
    if (stepError) return setMessage(stepError);
    if (currentStep !== 4) return;

    setIsSubmitting(true);
    try {
      const ownerPriceCentsFinal = dollarsToCents(state.ownerPrice);
      const normalPriceCentsFinal = dollarsToCents(state.normalPrice);
      if (!ownerPriceCentsFinal || !normalPriceCentsFinal) throw new Error("Owner price and normal price must be positive numbers.");

      const parsedPoints = Number(state.pointsPower);
      const pointsPower = state.ownershipType === "points" ? (Number.isFinite(parsedPoints) && parsedPoints > 0 ? Math.round(parsedPoints) : null) : null;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in as an owner.");

      const combinedDescription = [state.description.trim(), state.photoLinks.trim() ? `Photo links: ${state.photoLinks.trim()}` : ""].filter(Boolean).join("\n\n");
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
        owner_price_cents: ownerPriceCentsFinal,
        normal_price_cents: normalPriceCentsFinal,
        resort_booking_url: state.resortBookingUrl || null,
        description: combinedDescription || null,
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]}</p>
          <span className="text-xs text-zinc-600">Guided wizard</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }} />
        </div>
      </div>

      {currentStep === 1 ? (
        <div className="space-y-4">
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Use saved inventory template</p>
              <Link className="text-xs underline" href="/inventory">Manage inventory library</Link>
            </div>
            <select
              className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={state.selectedInventoryId}
              onChange={(e) => {
                const template = inventoryTemplates.find((item) => item.id === e.target.value);
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
                <option key={template.id} value={template.id}>{template.label} - {template.resort_name}</option>
              ))}
            </select>
          </div>

          <label className="block text-sm">Resort name
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" required value={state.resortName} onChange={(e) => setState((s) => ({ ...s, resortName: e.target.value }))} />
          </label>

          <label className="block text-sm">Resort booking portal (recommended)
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              value={state.selectedResortPortalId}
              onChange={(e) => {
                const selectedPortal = resortPortals.find((portal) => portal.id === e.target.value);
                setState((s) => ({ ...s, selectedResortPortalId: e.target.value, resortBookingUrl: selectedPortal?.booking_base_url ?? s.resortBookingUrl }));
              }}
            >
              <option value="">Custom URL only (no portal selected)</option>
              {resortPortals.map((portal) => (
                <option key={portal.id} value={portal.id}>{portal.resort_name}{portal.brand ? ` (${portal.brand})` : ""}</option>
              ))}
            </select>
          </label>

          <CityCountryLookup
            city={state.city}
            country={state.country}
            onCityChange={(value) => setState((s) => ({ ...s, city: value }))}
            onCountryChange={(value) => setState((s) => ({ ...s, country: value }))}
          />

          <label className="block text-sm">Resort booking URL
            <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" placeholder="https://..." value={state.resortBookingUrl} onChange={(e) => setState((s) => ({ ...s, resortBookingUrl: e.target.value }))} />
          </label>

          <label className="block text-sm">Photos (optional URL list)
            <textarea className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2" placeholder="https://image1..., https://image2..." value={state.photoLinks} onChange={(e) => setState((s) => ({ ...s, photoLinks: e.target.value }))} />
          </label>
        </div>
      ) : null}

      {currentStep === 2 ? (
        <div className="space-y-4">
          <label className="block text-sm">Ownership type
            <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={state.ownershipType} onChange={(e) => setState((s) => ({ ...s, ownershipType: e.target.value as ListingFormState["ownershipType"] }))}>
              <option value="fixed_week">Fixed week ownership</option>
              <option value="floating_week">Floating week ownership</option>
              <option value="points">Points ownership</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Season {state.ownershipType === "floating_week" ? "(required)" : "(optional)"}
              <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={state.seasonOption} onChange={(e) => setState((s) => ({ ...s, seasonOption: e.target.value, season: e.target.value && e.target.value !== "custom" ? e.target.value : "" }))}>
                <option value="">Select season</option>
                {SEASON_OPTIONS.map((season) => <option key={season} value={season}>{season}</option>)}
                <option value="custom">Custom</option>
              </select>
              {state.seasonOption === "custom" ? <input className="mt-2 w-full rounded border border-zinc-300 px-3 py-2" placeholder="Enter custom season" value={state.season} onChange={(e) => setState((s) => ({ ...s, season: e.target.value }))} /> : null}
            </label>

            <label className="block text-sm">Home week {state.ownershipType === "fixed_week" ? "(required)" : "(optional)"}
              <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={state.homeWeekOption} onChange={(e) => setState((s) => ({ ...s, homeWeekOption: e.target.value, homeWeek: e.target.value && e.target.value !== "custom" ? e.target.value : "" }))}>
                <option value="">Select week</option>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => <option key={week} value={`Week ${week}`}>Week {week}</option>)}
                <option value="custom">Custom</option>
              </select>
              {state.homeWeekOption === "custom" ? <input className="mt-2 w-full rounded border border-zinc-300 px-3 py-2" placeholder="Enter custom week" value={state.homeWeek} onChange={(e) => setState((s) => ({ ...s, homeWeek: e.target.value }))} /> : null}
            </label>
          </div>
          {state.ownershipType === "points" ? (
            <label className="block text-sm">Points power (required)
              <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" min="1" step="1" type="number" value={state.pointsPower} onChange={(e) => setState((s) => ({ ...s, pointsPower: e.target.value }))} />
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Check-in date
              <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" type="date" value={state.checkInDate} onChange={(e) => setState((s) => ({ ...s, checkInDate: e.target.value }))} />
            </label>
            <label className="block text-sm">Check-out date
              <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" type="date" value={state.checkOutDate} onChange={(e) => setState((s) => ({ ...s, checkOutDate: e.target.value }))} />
            </label>
          </div>

          <label className="block text-sm">Unit type
            <select className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" value={state.unitTypeOption} onChange={(e) => setState((s) => ({ ...s, unitTypeOption: e.target.value, unitType: e.target.value && e.target.value !== "custom" ? e.target.value : "" }))}>
              <option value="">Select unit type</option>
              {UNIT_TYPE_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              <option value="custom">Custom</option>
            </select>
            {state.unitTypeOption === "custom" ? <input className="mt-2 w-full rounded border border-zinc-300 px-3 py-2" placeholder="Enter custom unit type" value={state.unitType} onChange={(e) => setState((s) => ({ ...s, unitType: e.target.value }))} /> : null}
          </label>

          <label className="block text-sm">Notes for this inventory/week
            <textarea className="mt-1 min-h-20 w-full rounded border border-zinc-300 px-3 py-2" value={state.inventoryNotes} onChange={(e) => setState((s) => ({ ...s, inventoryNotes: e.target.value }))} />
          </label>
        </div>
      ) : null}

      {currentStep === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Owner price (USD)
              <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" min="1" step="0.01" type="number" value={state.ownerPrice} onChange={(e) => setState((s) => ({ ...s, ownerPrice: e.target.value }))} />
            </label>
            <label className="block text-sm">Normal hotel price (USD)
              <input className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" min="1" step="0.01" type="number" value={state.normalPrice} onChange={(e) => { setNormalPriceEditedManually(true); setState((s) => ({ ...s, normalPrice: e.target.value })); }} />
              {autoNormalPriceStatus === "loading" ? <p className="mt-1 text-xs text-zinc-600">Auto-checking normal hotel pricing...</p> : null}
              {autoNormalPriceStatus === "ready" && autoNormalPrice ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                  <span>Auto estimate: ${autoNormalPrice.toLocaleString("en-US")} total stay.</span>
                  <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs" onClick={() => { setNormalPriceEditedManually(false); setState((s) => ({ ...s, normalPrice: String(autoNormalPrice) })); }} type="button">Use estimate</button>
                </div>
              ) : null}
              {autoNormalPriceStatus === "error" ? <p className="mt-1 text-xs text-amber-700">Could not auto-fetch normal hotel price. Enter it manually.</p> : null}
            </label>
          </div>

          <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="font-medium">What travelers will see</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div><p className="text-xs text-zinc-600">Your listing price</p><p className="font-semibold">{ownerPriceCents ? formatMoney(ownerPriceCents) : "-"}</p></div>
              <div><p className="text-xs text-zinc-600">Typical hotel price</p><p className="font-semibold">{normalPriceCents ? formatMoney(normalPriceCents) : "-"}</p></div>
              <div><p className="text-xs text-zinc-600">Estimated traveler savings</p><p className="font-semibold">{estimatedSavingsCents ? formatMoney(estimatedSavingsCents) : "-"}</p></div>
            </div>
          </div>

          <label className="block text-sm">Listing description
            <textarea className="mt-1 min-h-24 w-full rounded border border-zinc-300 px-3 py-2" value={state.description} onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))} />
          </label>
        </div>
      ) : null}

      {currentStep === 4 ? (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold">Review before publishing</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-zinc-600">Resort</p><p className="font-medium">{state.resortName || "-"}</p><p className="text-zinc-600">{state.city || "-"}{state.country ? `, ${state.country}` : ""}</p></div>
            <div><p className="text-xs text-zinc-600">Dates</p><p className="font-medium">{state.checkInDate || "-"} to {state.checkOutDate || "-"}</p><p className="text-zinc-600">Unit: {state.unitType || "-"}</p></div>
            <div><p className="text-xs text-zinc-600">Ownership</p><p className="font-medium">{state.ownershipType.replace("_", " ")}</p><p className="text-zinc-600">Season: {state.season || "-"}</p><p className="text-zinc-600">Home week: {state.homeWeek || "-"}</p><p className="text-zinc-600">Points: {state.pointsPower || "-"}</p></div>
            <div><p className="text-xs text-zinc-600">Pricing</p><p className="font-medium">Owner price: {ownerPriceCents ? formatMoney(ownerPriceCents) : "-"}</p><p className="text-zinc-600">Normal hotel price: {normalPriceCents ? formatMoney(normalPriceCents) : "-"}</p><p className="text-zinc-600">Platform fee (5%): {ownerPriceCents ? formatMoney(payout.platformFeeCents) : "-"}</p><p className="text-zinc-600">Owner net: {ownerPriceCents ? formatMoney(payout.ownerNetCents) : "-"}</p></div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3">
        <button className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={currentStep === 1 || isSubmitting} onClick={handleBack} type="button">Back</button>
        {currentStep < WIZARD_STEPS.length ? (
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white" onClick={handleNext} type="button">Continue</button>
        ) : (
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Publishing..." : "Publish listing"}</button>
        )}
      </div>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
