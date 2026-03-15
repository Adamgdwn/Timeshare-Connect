import type { AmenityOption } from "@/lib/listings/resortCatalog";

export const AI_PREFILL_MAX_FILES = 3;
export const AI_PREFILL_MAX_FILE_BYTES = 8 * 1024 * 1024;

export type AiPrefillFieldName =
  | "resortName"
  | "city"
  | "country"
  | "portalBrand"
  | "resortPortalName"
  | "resortBookingUrl"
  | "ownershipType"
  | "availabilityMode"
  | "season"
  | "homeWeek"
  | "pointsPower"
  | "inventoryNotes"
  | "checkInDate"
  | "checkOutDate"
  | "availableStartDate"
  | "availableEndDate"
  | "minimumNights"
  | "maximumNights"
  | "unitType"
  | "amenities";

export type AiListingPrefillResult = {
  summary: string;
  warnings: string[];
  reviewRequired: AiPrefillFieldName[];
  extracted: {
    resortName: string | null;
    city: string | null;
    country: string | null;
    portalBrand: string | null;
    resortPortalName: string | null;
    resortBookingUrl: string | null;
    ownershipType: "fixed_week" | "floating_week" | "points" | null;
    availabilityMode: "exact" | "flex" | null;
    season: string | null;
    homeWeek: string | null;
    pointsPower: number | null;
    inventoryNotes: string | null;
    checkInDate: string | null;
    checkOutDate: string | null;
    availableStartDate: string | null;
    availableEndDate: string | null;
    minimumNights: number | null;
    maximumNights: number | null;
    unitType: string | null;
    amenities: AmenityOption[];
  };
};

export const AI_PREFILL_FIELD_LABELS: Record<AiPrefillFieldName, string> = {
  resortName: "Resort name",
  city: "City",
  country: "Country",
  portalBrand: "Portal brand",
  resortPortalName: "Portal mapping",
  resortBookingUrl: "Booking URL",
  ownershipType: "Ownership type",
  availabilityMode: "Availability mode",
  season: "Season",
  homeWeek: "Home week",
  pointsPower: "Points power",
  inventoryNotes: "Listing notes",
  checkInDate: "Check-in date",
  checkOutDate: "Check-out date",
  availableStartDate: "Available from",
  availableEndDate: "Available until",
  minimumNights: "Minimum nights",
  maximumNights: "Maximum nights",
  unitType: "Unit type",
  amenities: "Amenity tags",
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDate(value: unknown) {
  const normalized = normalizeString(value);
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

export function normalizeAiListingPrefillResult(
  value: unknown,
  allowedAmenities: readonly string[]
): AiListingPrefillResult {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const extracted =
    input.extracted && typeof input.extracted === "object"
      ? (input.extracted as Record<string, unknown>)
      : {};

  const reviewRequiredRaw = Array.isArray(input.reviewRequired) ? input.reviewRequired : [];
  const warningsRaw = Array.isArray(input.warnings) ? input.warnings : [];

  const reviewRequired = reviewRequiredRaw.filter((field): field is AiPrefillFieldName =>
    typeof field === "string" && field in AI_PREFILL_FIELD_LABELS
  );

  const amenitiesRaw = Array.isArray(extracted.amenities) ? extracted.amenities : [];
  const amenities = amenitiesRaw.filter(
    (amenity): amenity is AmenityOption =>
      typeof amenity === "string" && allowedAmenities.includes(amenity)
  );

  const ownershipType = extracted.ownershipType;
  const availabilityMode = extracted.availabilityMode;

  return {
    summary: normalizeString(input.summary) ?? "AI extracted a draft from the uploaded screenshots.",
    warnings: warningsRaw
      .filter((warning): warning is string => typeof warning === "string")
      .map((warning) => warning.trim())
      .filter(Boolean),
    reviewRequired,
    extracted: {
      resortName: normalizeString(extracted.resortName),
      city: normalizeString(extracted.city),
      country: normalizeString(extracted.country),
      portalBrand: normalizeString(extracted.portalBrand),
      resortPortalName: normalizeString(extracted.resortPortalName),
      resortBookingUrl: normalizeString(extracted.resortBookingUrl),
      ownershipType:
        ownershipType === "fixed_week" || ownershipType === "floating_week" || ownershipType === "points"
          ? ownershipType
          : null,
      availabilityMode: availabilityMode === "exact" || availabilityMode === "flex" ? availabilityMode : null,
      season: normalizeString(extracted.season),
      homeWeek: normalizeString(extracted.homeWeek),
      pointsPower: normalizePositiveInteger(extracted.pointsPower),
      inventoryNotes: normalizeString(extracted.inventoryNotes),
      checkInDate: normalizeDate(extracted.checkInDate),
      checkOutDate: normalizeDate(extracted.checkOutDate),
      availableStartDate: normalizeDate(extracted.availableStartDate),
      availableEndDate: normalizeDate(extracted.availableEndDate),
      minimumNights: normalizePositiveInteger(extracted.minimumNights),
      maximumNights: normalizePositiveInteger(extracted.maximumNights),
      unitType: normalizeString(extracted.unitType),
      amenities,
    },
  };
}
