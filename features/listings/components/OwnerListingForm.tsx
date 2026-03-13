"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityCountryLookup from "@/components/forms/CityCountryLookup";
import ListingPhotoManager from "@/features/listings/components/ListingPhotoManager";
import { calculatePayoutBreakdown } from "@/lib/pricing";
import { OWNER_LISTING_DRAFT_KEY } from "@/lib/listings/draft";
import { formatListingDateSummary, getNightCount } from "@/lib/listings/availability";
import {
  createExternalPhotoAsset,
  serializePhotoAssets,
  type ListingPhotoAsset,
} from "@/lib/listings/media";
import {
  AMENITY_OPTIONS,
  findResortCatalogMatches,
  getResortCatalogByKey,
  inferResortCatalogItem,
  type AmenityOption,
  type ResortCatalogItem,
} from "@/lib/listings/resortCatalog";
import {
  formatAmenityLabel,
  getIsoWeekLabel,
  getOwnershipCopy,
  getSavingsPercentage,
  toggleAmenity,
} from "@/lib/listings/metadata";

type ListingFormState = {
  selectedInventoryId: string;
  selectedResortPortalId: string;
  resortSearch: string;
  resortKey: string;
  availabilityMode: "exact" | "flex";
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
  photos: ListingPhotoAsset[];
  availableStartDate: string;
  availableEndDate: string;
  minimumNights: string;
  maximumNights: string;
  checkInDate: string;
  checkOutDate: string;
  unitTypeOption: string;
  unitType: string;
  ownerPrice: string;
  normalPrice: string;
  resortBookingUrl: string;
  descriptionTemplate: string;
  description: string;
  amenities: AmenityOption[];
};

type OwnerInventoryTemplate = {
  id: string;
  label: string;
  resort_key: string | null;
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
  description_template: string | null;
  amenities: string[] | null;
  photo_urls: string[] | null;
  photo_storage_paths?: string[] | null;
};

type ResortPortal = {
  id: string;
  resort_name: string;
  brand: string | null;
  booking_base_url: string;
  requires_login: boolean;
  supports_deeplink: boolean;
};

type ComparableListing = {
  id: string;
  availability_mode: "exact" | "flex";
  available_start_date: string | null;
  available_end_date: string | null;
  minimum_nights: number | null;
  maximum_nights: number | null;
  resort_name: string;
  city: string;
  check_in_date: string | null;
  check_out_date: string | null;
  unit_type: string;
  owner_price_cents: number;
  normal_price_cents: number;
  photo_urls: string[] | null;
};

type DraftPayload = {
  currentStep: number;
  normalPriceEditedManually: boolean;
  savedAt: string;
  state: ListingFormState;
};

const initialState: ListingFormState = {
  selectedInventoryId: "",
  selectedResortPortalId: "",
  resortSearch: "",
  resortKey: "",
  availabilityMode: "exact",
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
  photos: [],
  availableStartDate: "",
  availableEndDate: "",
  minimumNights: "7",
  maximumNights: "",
  checkInDate: "",
  checkOutDate: "",
  unitTypeOption: "",
  unitType: "",
  ownerPrice: "",
  normalPrice: "",
  resortBookingUrl: "",
  descriptionTemplate: "",
  description: "",
  amenities: [],
};

const UNIT_TYPE_OPTIONS = ["studio", "1 bedroom", "2 bedroom", "3 bedroom", "lockoff"];
const SEASON_OPTIONS = ["Platinum / Prime", "High season", "Shoulder season", "Low season", "Holiday season"];
const WIZARD_STEPS = ["Choose Resort", "Week & Unit", "Price It", "Review & Publish"];
const DRAFT_EVENT = "tc-owner-listing-draft-updated";

function dollarsToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const exact = portals.find((portal) => portal.resort_name.trim().toLowerCase() === normalized);
  if (exact) return exact.id;
  return portals.find((portal) => normalized.includes(portal.resort_name.trim().toLowerCase()))?.id ?? "";
}

function ensureAmenityOptions(values: string[] | null | undefined): AmenityOption[] {
  return (values ?? []).filter((value): value is AmenityOption =>
    (AMENITY_OPTIONS as readonly string[]).includes(value)
  );
}

function hasMeaningfulDraft(state: ListingFormState) {
  return Boolean(
    state.selectedInventoryId ||
      state.resortName.trim() ||
      state.city.trim() ||
      state.checkInDate ||
      state.ownerPrice ||
      state.normalPrice
  );
}

function applyCatalogSelection(
  current: ListingFormState,
  resort: ResortCatalogItem,
  portals: ResortPortal[]
): ListingFormState {
  const portalId = findPortalIdByResortName(portals, resort.name);

  return {
    ...current,
    resortSearch: resort.name,
    resortKey: resort.key,
    resortName: resort.name,
    city: resort.city,
    country: resort.country,
    selectedResortPortalId: portalId || current.selectedResortPortalId,
    resortBookingUrl: resort.bookingBaseUrl ?? current.resortBookingUrl,
    descriptionTemplate: resort.defaultDescription,
    description: current.description || resort.defaultDescription,
    photos: resort.photos.map(createExternalPhotoAsset),
    amenities: resort.amenities,
    unitTypeOption: resolveUnitTypeOption(current.unitType || resort.defaultUnitTypes[0] || ""),
    unitType: current.unitType || resort.defaultUnitTypes[0] || "",
  };
}

function applyTemplateSelection(
  current: ListingFormState,
  template: OwnerInventoryTemplate,
  portals: ResortPortal[]
): ListingFormState {
  const catalogResort = template.resort_key ? getResortCatalogByKey(template.resort_key) : null;
  const resortPhotos = [...(template.photo_urls ?? []), ...(catalogResort?.photos ?? [])].map(createExternalPhotoAsset);
  const season = template.season || "";
  const homeWeek = template.home_week || "";
  const unitType = template.unit_type || "";

  return {
    ...current,
    selectedInventoryId: template.id,
    selectedResortPortalId:
      findPortalIdByResortName(portals, template.resort_name) || current.selectedResortPortalId,
    resortSearch: template.resort_name,
    resortKey: template.resort_key || catalogResort?.key || "",
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
    photos: resortPhotos,
    unitTypeOption: resolveUnitTypeOption(unitType),
    unitType,
    resortBookingUrl: template.resort_booking_url || catalogResort?.bookingBaseUrl || "",
    descriptionTemplate: template.description_template || catalogResort?.defaultDescription || "",
    description: current.description || template.description_template || catalogResort?.defaultDescription || "",
    amenities: ensureAmenityOptions([...(template.amenities ?? []), ...(catalogResort?.amenities ?? [])]),
  };
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
  const [comparableListings, setComparableListings] = useState<ComparableListing[]>([]);
  const [comparableStatus, setComparableStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const ownerPriceCents = dollarsToCents(state.ownerPrice) ?? 0;
  const normalPriceCents = dollarsToCents(state.normalPrice) ?? 0;
  const payout = calculatePayoutBreakdown(ownerPriceCents);
  const estimatedSavingsCents = Math.max(0, normalPriceCents - ownerPriceCents);
  const savingsPercentage = getSavingsPercentage(ownerPriceCents, normalPriceCents);
  const stayLength =
    state.availabilityMode === "exact"
      ? getNightCount(state.checkInDate, state.checkOutDate)
      : getNightCount(state.availableStartDate, state.availableEndDate);
  const stayLengthLabel =
    state.availabilityMode === "flex"
      ? `${state.minimumNights || "-"}${state.maximumNights ? `-${state.maximumNights}` : "+"} nights`
      : stayLength
        ? `${stayLength} nights`
        : "-";
  const checkInWeekLabel = getIsoWeekLabel(state.checkInDate);
  const resortMatches = useMemo(
    () => findResortCatalogMatches(state.resortSearch || state.resortName, 5),
    [state.resortName, state.resortSearch]
  );
  const selectedTemplate = inventoryTemplates.find((template) => template.id === state.selectedInventoryId) ?? null;
  const inferredResort = state.resortKey
    ? getResortCatalogByKey(state.resortKey)
    : inferResortCatalogItem({ resortName: state.resortName, city: state.city });
  const comparableMedianPriceCents = useMemo(() => {
    if (comparableListings.length === 0) return 0;
    const sorted = comparableListings.map((listing) => listing.owner_price_cents).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }, [comparableListings]);
  const suggestedPriceCents =
    comparableMedianPriceCents || (normalPriceCents > 0 ? Math.round(normalPriceCents * 0.72) : 0);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const [templateResult, portalResult] = await Promise.all([
        supabase
          .from("owner_inventory")
          .select(
            "id,label,resort_key,ownership_type,season,home_week,points_power,inventory_notes,resort_name,city,country,unit_type,resort_booking_url,description_template,amenities,photo_urls"
          )
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
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(OWNER_LISTING_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DraftPayload>;
      if (!parsed.state) return;
      setState({ ...initialState, ...parsed.state });
      setCurrentStep(parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4 ? parsed.currentStep : 1);
      setNormalPriceEditedManually(Boolean(parsed.normalPriceEditedManually));
      setDraftNotice(parsed.savedAt ? `Draft restored from ${new Date(parsed.savedAt).toLocaleString()}.` : "Draft restored.");
    } catch {
      window.localStorage.removeItem(OWNER_LISTING_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeout = window.setTimeout(() => {
      if (!hasMeaningfulDraft(state)) {
        window.localStorage.removeItem(OWNER_LISTING_DRAFT_KEY);
        window.dispatchEvent(new Event(DRAFT_EVENT));
        return;
      }

      const payload: DraftPayload = {
        currentStep,
        normalPriceEditedManually,
        savedAt: new Date().toISOString(),
        state,
      };
      window.localStorage.setItem(OWNER_LISTING_DRAFT_KEY, JSON.stringify(payload));
      window.dispatchEvent(new Event(DRAFT_EVENT));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [currentStep, normalPriceEditedManually, state]);

  useEffect(() => {
    if (!state.city || !state.checkInDate || !state.checkOutDate || state.checkOutDate <= state.checkInDate) {
      setAutoNormalPriceStatus("idle");
      setAutoNormalPrice(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
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
          setState((current) => ({ ...current, normalPrice: String(payload.totalUsd) }));
        }
      } catch {
        setAutoNormalPriceStatus("error");
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [normalPriceEditedManually, state.checkInDate, state.checkOutDate, state.city, state.country, state.normalPrice, state.resortName]);

  useEffect(() => {
    if (!state.city && !state.resortName) {
      setComparableListings([]);
      setComparableStatus("idle");
      return;
    }

    let isCancelled = false;

    const timeout = window.setTimeout(async () => {
      setComparableStatus("loading");
      try {
        let query = supabase
          .from("listings")
          .select("id,availability_mode,available_start_date,available_end_date,minimum_nights,maximum_nights,resort_name,city,check_in_date,check_out_date,unit_type,owner_price_cents,normal_price_cents,photo_urls")
          .eq("is_active", true)
          .limit(8);

        if (state.resortKey) {
          query = query.eq("resort_key", state.resortKey);
        } else if (state.city) {
          query = query.ilike("city", state.city);
        } else {
          query = query.ilike("resort_name", `%${state.resortName}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (isCancelled) return;

        const filtered = ((data ?? []) as ComparableListing[]).filter((listing) => {
          const resortMatch = state.resortName
            ? listing.resort_name.toLowerCase().includes(state.resortName.trim().toLowerCase())
            : true;
          const cityMatch = state.city ? listing.city.toLowerCase() === state.city.trim().toLowerCase() : true;
          return state.resortKey ? true : resortMatch || cityMatch;
        });

        setComparableListings(filtered.slice(0, 4));
        setComparableStatus("ready");
      } catch {
        if (!isCancelled) {
          setComparableListings([]);
          setComparableStatus("error");
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [state.city, state.resortKey, state.resortName, supabase]);

  function validateStep(step: number) {
    if (step === 1) {
      if (!state.resortName.trim()) return "Resort name is required.";
      if (!state.city.trim()) return "City is required.";
    }
    if (step === 2) {
      if (state.availabilityMode === "exact") {
        if (!state.checkInDate || !state.checkOutDate) return "Check-in and check-out dates are required.";
        if (state.checkOutDate <= state.checkInDate) return "Check-out date must be after check-in date.";
      }
      if (state.availabilityMode === "flex") {
        if (!state.availableStartDate || !state.availableEndDate) return "Availability window start and end dates are required.";
        if (state.availableEndDate < state.availableStartDate) return "Availability end date must be after the start date.";
        const minNights = Number(state.minimumNights);
        const maxNights = Number(state.maximumNights);
        if (!(Number.isFinite(minNights) && minNights > 0)) return "Minimum nights must be a positive number.";
        if (state.maximumNights && !(Number.isFinite(maxNights) && maxNights >= minNights)) {
          return "Maximum nights must be blank or greater than minimum nights.";
        }
      }
      if (!state.unitType.trim()) return "Unit type is required.";
      if (state.ownershipType === "floating_week" && !state.season.trim()) return "Floating week owners should provide the available season.";
      if (state.ownershipType === "fixed_week" && !state.homeWeek.trim()) return "Fixed week owners should provide the owned week.";
      const parsedPoints = Number(state.pointsPower);
      if (state.ownershipType === "points" && !(Number.isFinite(parsedPoints) && parsedPoints > 0)) {
        return "Points owners must provide a positive points balance.";
      }
    }
    if (step === 3 && (!dollarsToCents(state.ownerPrice) || !dollarsToCents(state.normalPrice))) {
      return "Owner price and normal price must be positive numbers.";
    }
    return "";
  }

  function handleNext() {
    setMessage("");
    const error = validateStep(currentStep);
    if (error) {
      setMessage(error);
      return;
    }
    setCurrentStep((value) => Math.min(WIZARD_STEPS.length, value + 1));
  }

  function handleBack() {
    setMessage("");
    setCurrentStep((value) => Math.max(1, value - 1));
  }

  function clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(OWNER_LISTING_DRAFT_KEY);
      window.dispatchEvent(new Event(DRAFT_EVENT));
    }
    setDraftNotice("Draft cleared.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const stepError = validateStep(currentStep);
    if (stepError) {
      setMessage(stepError);
      return;
    }
    if (currentStep !== 4) return;

    setIsSubmitting(true);
    try {
      const ownerPriceCentsFinal = dollarsToCents(state.ownerPrice);
      const normalPriceCentsFinal = dollarsToCents(state.normalPrice);
      if (!ownerPriceCentsFinal || !normalPriceCentsFinal) {
        throw new Error("Owner price and normal price must be positive numbers.");
      }

      const parsedPoints = Number(state.pointsPower);
      const pointsPower =
        state.ownershipType === "points"
          ? Number.isFinite(parsedPoints) && parsedPoints > 0
            ? Math.round(parsedPoints)
            : null
          : null;
      const minimumNights =
        state.availabilityMode === "flex" && Number.isFinite(Number(state.minimumNights))
          ? Math.round(Number(state.minimumNights))
          : null;
      const maximumNights =
        state.availabilityMode === "flex" && state.maximumNights && Number.isFinite(Number(state.maximumNights))
          ? Math.round(Number(state.maximumNights))
          : null;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("You must be logged in as an owner.");

      const { photoUrls, photoStoragePaths } = serializePhotoAssets(state.photos);

      const { error: insertError } = await supabase.from("listings").insert({
        owner_id: user.id,
        inventory_id: state.selectedInventoryId || null,
        resort_portal_id: state.selectedResortPortalId || null,
        resort_key: state.resortKey || null,
        availability_mode: state.availabilityMode,
        available_start_date: state.availabilityMode === "flex" ? state.availableStartDate : null,
        available_end_date: state.availabilityMode === "flex" ? state.availableEndDate : null,
        minimum_nights: minimumNights,
        maximum_nights: maximumNights,
        ownership_type: state.ownershipType,
        season: state.season || null,
        home_week: state.homeWeek || null,
        points_power: pointsPower,
        inventory_notes: state.inventoryNotes || null,
        resort_name: state.resortName,
        city: state.city,
        country: state.country || null,
        check_in_date: state.availabilityMode === "exact" ? state.checkInDate : null,
        check_out_date: state.availabilityMode === "exact" ? state.checkOutDate : null,
        unit_type: state.unitType,
        owner_price_cents: ownerPriceCentsFinal,
        normal_price_cents: normalPriceCentsFinal,
        resort_booking_url: state.resortBookingUrl || null,
        description_template: state.descriptionTemplate || null,
        description: state.description || null,
        amenities: state.amenities,
        photo_urls: photoUrls,
        photo_storage_paths: photoStoragePaths,
        is_active: true,
      });
      if (insertError) throw insertError;

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(OWNER_LISTING_DRAFT_KEY);
        window.dispatchEvent(new Event(DRAFT_EVENT));
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]}
            </p>
            <p className="text-xs text-zinc-600">Wizard + autosave draft</p>
          </div>
          {selectedTemplate ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs text-zinc-700">
              Using saved property: {selectedTemplate.label}
            </span>
          ) : null}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }} />
        </div>
        {draftNotice ? <p className="mt-3 text-xs text-zinc-600">{draftNotice}</p> : null}
      </div>

      {currentStep === 1 ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Use a saved property first</p>
                <p className="text-xs text-zinc-600">Returning owners should only need dates and pricing.</p>
              </div>
              <Link className="text-xs underline" href="/inventory">
                Manage inventory library
              </Link>
            </div>

            {inventoryTemplates.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">No saved properties yet. Add one in your inventory library or create this listing manually.</p>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {inventoryTemplates.map((template) => {
                  const photo = template.photo_urls?.[0] || getResortCatalogByKey(template.resort_key || "")?.photos[0] || "";
                  const isSelected = state.selectedInventoryId === template.id;
                  return (
                    <button
                      className={`overflow-hidden rounded-2xl border text-left transition ${
                        isSelected ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200 bg-white hover:border-zinc-400"
                      }`}
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setState((current) => applyTemplateSelection(current, template, resortPortals));
                        setNormalPriceEditedManually(false);
                      }}
                    >
                      {photo ? <img alt={template.resort_name} className="h-32 w-full object-cover" src={photo} /> : null}
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{template.label}</p>
                            <p className="text-lg font-semibold">{template.resort_name}</p>
                            <p className="text-sm text-zinc-600">
                              {template.city}
                              {template.country ? `, ${template.country}` : ""}
                            </p>
                          </div>
                          {isSelected ? <span className="rounded-full bg-zinc-900 px-2 py-1 text-[11px] text-white">Selected</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-700">
                          <span className="rounded-full bg-zinc-100 px-2 py-1">{template.unit_type}</span>
                          <span className="rounded-full bg-zinc-100 px-2 py-1">{getOwnershipCopy(template.ownership_type).label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              className="mt-4 rounded-xl border border-zinc-300 px-4 py-2 text-sm"
              type="button"
              onClick={() => setState((current) => ({ ...initialState, ownerPrice: current.ownerPrice, normalPrice: current.normalPrice }))}
            >
              Add a new resort manually
            </button>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Smart resort lookup</p>
                <p className="text-xs text-zinc-600">Recognized resorts prefill location, booking site, photos, and amenities.</p>
              </div>
              {inferredResort ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">Recognized resort</span> : null}
            </div>

            <label className="mt-4 block text-sm">
              Resort name
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Start typing a resort name"
                required
                value={state.resortSearch || state.resortName}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    selectedInventoryId: "",
                    resortSearch: e.target.value,
                    resortName: e.target.value,
                    resortKey: current.resortKey && current.resortName !== e.target.value ? "" : current.resortKey,
                  }))
                }
              />
            </label>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {resortMatches.map((resort) => (
                <button
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-zinc-400"
                  key={resort.key}
                  type="button"
                  onClick={() => {
                    setState((current) => applyCatalogSelection(current, resort, resortPortals));
                    setNormalPriceEditedManually(false);
                  }}
                >
                  <img alt={resort.name} className="h-14 w-20 rounded-lg object-cover" src={resort.photos[0]} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{resort.name}</span>
                    <span className="block text-xs text-zinc-600">
                      {resort.city}, {resort.country}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Resort booking portal
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                  value={state.selectedResortPortalId}
                  onChange={(e) => {
                    const selectedPortal = resortPortals.find((portal) => portal.id === e.target.value);
                    setState((current) => ({
                      ...current,
                      selectedResortPortalId: e.target.value,
                      resortBookingUrl: selectedPortal?.booking_base_url ?? current.resortBookingUrl,
                    }));
                  }}
                >
                  <option value="">Custom URL only</option>
                  {resortPortals.map((portal) => (
                    <option key={portal.id} value={portal.id}>
                      {portal.resort_name}
                      {portal.brand ? ` (${portal.brand})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                Resort booking URL
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                  placeholder="https://..."
                  value={state.resortBookingUrl}
                  onChange={(e) => setState((current) => ({ ...current, resortBookingUrl: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4">
              <CityCountryLookup
                city={state.city}
                country={state.country}
                onCityChange={(value) => setState((current) => ({ ...current, city: value }))}
                onCountryChange={(value) => setState((current) => ({ ...current, country: value }))}
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <ListingPhotoManager
              helperText="Aim for at least 3 photos. Recognized resorts can preload these, and you can upload your own unit shots."
              minimumCount={3}
              onChange={(photos) => setState((current) => ({ ...current, photos }))}
              photos={state.photos}
              scope="listing"
              title="Photos"
            />

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Amenity tags</p>
                  <p className="text-xs text-zinc-600">These power traveler-side filters.</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                  {state.amenities.length} selected
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
          </section>
        </div>
      ) : null}

      {currentStep === 2 ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold">How do you book this stay?</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(["fixed_week", "floating_week", "points"] as const).map((value) => {
                const copy = getOwnershipCopy(value);
                const isSelected = state.ownershipType === value;
                return (
                  <button
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
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
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold">What are you publishing?</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  state.availabilityMode === "exact" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
                type="button"
                onClick={() => setState((current) => ({ ...current, availabilityMode: "exact" }))}
              >
                <span className="block text-sm font-semibold">Exact stay</span>
                <span className={`mt-1 block text-xs ${state.availabilityMode === "exact" ? "text-zinc-200" : "text-zinc-600"}`}>
                  You already know the exact check-in and check-out dates.
                </span>
              </button>
              <button
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  state.availabilityMode === "flex" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
                type="button"
                onClick={() => setState((current) => ({ ...current, availabilityMode: "flex" }))}
              >
                <span className="block text-sm font-semibold">Flexible availability</span>
                <span className={`mt-1 block text-xs ${state.availabilityMode === "flex" ? "text-zinc-200" : "text-zinc-600"}`}>
                  You can search/book within a larger availability window using floating inventory or points.
                </span>
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              Season {state.ownershipType === "floating_week" ? "(required)" : "(optional)"}
              <select
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={state.seasonOption}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    seasonOption: e.target.value,
                    season: e.target.value && e.target.value !== "custom" ? e.target.value : "",
                  }))
                }
              >
                <option value="">Select season</option>
                {SEASON_OPTIONS.map((season) => (
                  <option key={season} value={season}>
                    {season}
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

            <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              Home week {state.ownershipType === "fixed_week" ? "(required)" : "(optional)"}
              <select
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={state.homeWeekOption}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    homeWeekOption: e.target.value,
                    homeWeek: e.target.value && e.target.value !== "custom" ? e.target.value : "",
                  }))
                }
              >
                <option value="">Select week</option>
                {Array.from({ length: 52 }, (_, index) => index + 1).map((week) => (
                  <option key={week} value={`Week ${week}`}>
                    Week {week}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
              {state.homeWeekOption === "custom" ? (
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                  placeholder="Enter custom week"
                  value={state.homeWeek}
                  onChange={(e) => setState((current) => ({ ...current, homeWeek: e.target.value }))}
                />
              ) : null}
            </label>

            <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              Points power {state.ownershipType === "points" ? "(required)" : "(optional)"}
              <input
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                min="1"
                step="1"
                type="number"
                value={state.pointsPower}
                onChange={(e) => setState((current) => ({ ...current, pointsPower: e.target.value }))}
              />
            </label>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {state.availabilityMode === "exact" ? "Choose dates" : "Set your availability window"}
                </p>
                <p className="text-xs text-zinc-600">
                  {state.availabilityMode === "exact"
                    ? "Use the calendar picker to confirm the exact stay window."
                    : "Travelers will search inside this range and request the dates they want."}
                </p>
              </div>
              {state.availabilityMode === "exact" && checkInWeekLabel ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">{checkInWeekLabel}</span>
              ) : null}
            </div>

            {state.availabilityMode === "exact" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Check-in date
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    type="date"
                    value={state.checkInDate}
                    onChange={(e) => setState((current) => ({ ...current, checkInDate: e.target.value }))}
                  />
                </label>
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Check-out date
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    type="date"
                    value={state.checkOutDate}
                    onChange={(e) => setState((current) => ({ ...current, checkOutDate: e.target.value }))}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr]">
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Available from
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    type="date"
                    value={state.availableStartDate}
                    onChange={(e) => setState((current) => ({ ...current, availableStartDate: e.target.value }))}
                  />
                </label>
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Available until
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    type="date"
                    value={state.availableEndDate}
                    onChange={(e) => setState((current) => ({ ...current, availableEndDate: e.target.value }))}
                  />
                </label>
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Min nights
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    min="1"
                    step="1"
                    type="number"
                    value={state.minimumNights}
                    onChange={(e) => setState((current) => ({ ...current, minimumNights: e.target.value }))}
                  />
                </label>
                <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  Max nights
                  <input
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                    min="1"
                    step="1"
                    type="number"
                    value={state.maximumNights}
                    onChange={(e) => setState((current) => ({ ...current, maximumNights: e.target.value }))}
                  />
                </label>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Stay length</p>
                <p className="mt-1 text-lg font-semibold">{stayLengthLabel}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Selected dates</p>
                <p className="mt-1 text-sm font-medium">
                  {formatListingDateSummary({
                    availability_mode: state.availabilityMode,
                    check_in_date: state.checkInDate,
                    check_out_date: state.checkOutDate,
                    available_start_date: state.availableStartDate,
                    available_end_date: state.availableEndDate,
                    minimum_nights: state.minimumNights ? Number(state.minimumNights) : null,
                    maximum_nights: state.maximumNights ? Number(state.maximumNights) : null,
                  })}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Week check</p>
                <p className="mt-1 text-sm font-medium">
                  {state.availabilityMode === "exact"
                    ? state.homeWeek && checkInWeekLabel
                      ? `${state.homeWeek} vs ${checkInWeekLabel}`
                      : checkInWeekLabel || "-"
                    : `Night range: ${state.minimumNights || "-"}${state.maximumNights ? `-${state.maximumNights}` : "+"}`}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              Unit type
              <select
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={state.unitTypeOption}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    unitTypeOption: e.target.value,
                    unitType: e.target.value && e.target.value !== "custom" ? e.target.value : "",
                  }))
                }
              >
                <option value="">Select unit type</option>
                {UNIT_TYPE_OPTIONS.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {unitType}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
              {state.unitTypeOption === "custom" ? (
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2"
                  placeholder="Enter custom unit type"
                  value={state.unitType}
                  onChange={(e) => setState((current) => ({ ...current, unitType: e.target.value }))}
                />
              ) : null}
            </label>

            <label className="block rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              Notes for this week
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Guest certificate rules, date flexibility, view notes, transfer timing..."
                value={state.inventoryNotes}
                onChange={(e) => setState((current) => ({ ...current, inventoryNotes: e.target.value }))}
              />
            </label>
          </section>
        </div>
      ) : null}

      {currentStep === 3 ? (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">Set pricing</p>
              <p className="text-xs text-zinc-600">Show your value against hotel pricing while keeping owner net visible.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Owner price (USD)
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                  min="1"
                  step="0.01"
                  type="number"
                  value={state.ownerPrice}
                  onChange={(e) => setState((current) => ({ ...current, ownerPrice: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Normal hotel price (USD)
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-base"
                  min="1"
                  step="0.01"
                  type="number"
                  value={state.normalPrice}
                  onChange={(e) => {
                    setNormalPriceEditedManually(true);
                    setState((current) => ({ ...current, normalPrice: e.target.value }));
                  }}
                />
                {autoNormalPriceStatus === "loading" ? <p className="mt-1 text-xs text-zinc-600">Checking hotel pricing...</p> : null}
                {autoNormalPriceStatus === "ready" && autoNormalPrice ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <span>Auto estimate: ${autoNormalPrice.toLocaleString("en-US")} total stay.</span>
                    <button
                      className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs"
                      type="button"
                      onClick={() => {
                        setNormalPriceEditedManually(false);
                        setState((current) => ({ ...current, normalPrice: String(autoNormalPrice) }));
                      }}
                    >
                      Use estimate
                    </button>
                  </div>
                ) : null}
                {autoNormalPriceStatus === "error" ? <p className="mt-1 text-xs text-amber-700">Could not auto-fetch hotel pricing.</p> : null}
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Traveler pays</p>
                <p className="mt-1 text-lg font-semibold">{ownerPriceCents ? formatMoney(ownerPriceCents) : "-"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Platform fee</p>
                <p className="mt-1 text-lg font-semibold">{ownerPriceCents ? formatMoney(payout.platformFeeCents) : "-"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Owner net</p>
                <p className="mt-1 text-lg font-semibold">{ownerPriceCents ? formatMoney(payout.ownerNetCents) : "-"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Traveler savings</p>
                <p className="mt-1 text-lg font-semibold">
                  {estimatedSavingsCents ? `${formatMoney(estimatedSavingsCents)}${savingsPercentage ? ` (${savingsPercentage}% off)` : ""}` : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Suggested price</p>
                  <p className="text-xs text-zinc-600">
                    Based on {comparableMedianPriceCents ? "comparable active listings" : "the hotel price benchmark"}.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm"
                  disabled={!suggestedPriceCents}
                  type="button"
                  onClick={() => setState((current) => ({ ...current, ownerPrice: String((suggestedPriceCents / 100).toFixed(2)) }))}
                >
                  {suggestedPriceCents ? `Use ${formatMoney(suggestedPriceCents)}` : "Need more pricing data"}
                </button>
              </div>
            </div>

            <label className="block text-sm">
              Description
              <textarea
                className="mt-1 min-h-32 w-full rounded-2xl border border-zinc-300 px-3 py-2"
                placeholder="Summarize the stay, view, room setup, and any booking notes travelers should know."
                value={state.description}
                onChange={(e) => setState((current) => ({ ...current, description: e.target.value }))}
              />
            </label>
          </section>

          <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">Comparable listings</p>
              <p className="text-xs text-zinc-600">Helps owners understand market context before publishing.</p>
            </div>

            {comparableStatus === "loading" ? <p className="text-sm text-zinc-600">Loading comparables...</p> : null}
            {comparableStatus === "error" ? <p className="text-sm text-amber-700">Comparable listings are not available right now.</p> : null}
            {comparableStatus === "ready" && comparableListings.length === 0 ? (
              <p className="text-sm text-zinc-600">No comparable listings yet for this resort. Suggested pricing will use hotel pricing instead.</p>
            ) : null}
            {comparableListings.map((listing) => (
              <article className="overflow-hidden rounded-2xl border border-zinc-200" key={listing.id}>
                {listing.photo_urls?.[0] ? (
                  <img alt={listing.resort_name} className="h-28 w-full object-cover" src={listing.photo_urls[0]} />
                ) : null}
                <div className="space-y-1 p-3">
                  <p className="text-sm font-semibold">{listing.resort_name}</p>
                  <p className="text-xs text-zinc-600">
                    {listing.city} | {listing.unit_type}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {formatListingDateSummary({
                      availability_mode: listing.availability_mode,
                      check_in_date: listing.check_in_date,
                      check_out_date: listing.check_out_date,
                      available_start_date: listing.available_start_date,
                      available_end_date: listing.available_end_date,
                      minimum_nights: listing.minimum_nights,
                      maximum_nights: listing.maximum_nights,
                    })}
                  </p>
                  <p className="text-sm font-medium">{formatMoney(listing.owner_price_cents)} owner price</p>
                </div>
              </article>
            ))}
          </aside>
        </div>
      ) : null}

      {currentStep === 4 ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Traveler view preview</p>
                <p className="text-xs text-zinc-600">This mirrors the card style travelers see when searching.</p>
              </div>
              <button className="rounded-xl border border-zinc-300 px-4 py-2 text-sm" type="button" onClick={clearDraft}>
                Clear draft
              </button>
            </div>

            <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
              {state.photos[0]?.url ? (
                <img alt={state.resortName || "Resort photo"} className="h-56 w-full object-cover" src={state.photos[0].url} />
              ) : (
                <div className="h-56 bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300" />
              )}
              <div className="grid gap-5 p-5 md:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {state.amenities.slice(0, 4).map((amenity) => (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-zinc-700" key={amenity}>
                          {formatAmenityLabel(amenity)}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{state.resortName || "Resort name"}</h2>
                    <p className="text-sm text-zinc-600">
                      {state.city || "City"}
                      {state.country ? `, ${state.country}` : ""}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Dates</p>
                      <p className="text-sm font-medium">
                        {formatListingDateSummary({
                          availability_mode: state.availabilityMode,
                          check_in_date: state.checkInDate,
                          check_out_date: state.checkOutDate,
                          available_start_date: state.availableStartDate,
                          available_end_date: state.availableEndDate,
                          minimum_nights: state.minimumNights ? Number(state.minimumNights) : null,
                          maximum_nights: state.maximumNights ? Number(state.maximumNights) : null,
                        })}
                      </p>
                      <p className="text-sm text-zinc-600">{stayLengthLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Unit</p>
                      <p className="text-sm font-medium">{state.unitType || "-"}</p>
                      <p className="text-sm text-zinc-600">{getOwnershipCopy(state.ownershipType).label}</p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-700">
                    {state.description || state.descriptionTemplate || "Add a short description to complete the traveler preview."}
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 line-through">
                    {normalPriceCents ? `${formatMoney(normalPriceCents)} hotel price` : "Hotel benchmark pending"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{ownerPriceCents ? formatMoney(ownerPriceCents) : "-"}</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {estimatedSavingsCents ? `Save ${formatMoney(estimatedSavingsCents)}${savingsPercentage ? ` (${savingsPercentage}%)` : ""}` : "Add pricing to show savings"}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm text-zinc-700">
                    <p>Platform fee: {ownerPriceCents ? formatMoney(payout.platformFeeCents) : "-"}</p>
                    <p>Owner net: {ownerPriceCents ? formatMoney(payout.ownerNetCents) : "-"}</p>
                    <p>Photos: {state.photos.length}</p>
                    <p>Amenities: {state.amenities.length || 0}</p>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4">
        <button
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={currentStep === 1 || isSubmitting}
          onClick={handleBack}
          type="button"
        >
          Back
        </button>
        {currentStep < WIZARD_STEPS.length ? (
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white" onClick={handleNext} type="button">
            Continue
          </button>
        ) : (
          <button
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Publishing..." : "Publish listing"}
          </button>
        )}
      </div>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
