import type { AmenityOption } from "@/lib/listings/resortCatalog";

export function parsePhotoUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export function formatAmenityLabel(value: string) {
  return value
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getOwnershipCopy(value: "fixed_week" | "floating_week" | "points") {
  if (value === "fixed_week") {
    return {
      label: "Fixed week",
      description: "You own the same week each year and already know the exact check-in window.",
    };
  }
  if (value === "floating_week") {
    return {
      label: "Floating week",
      description: "You can offer dates within a season, then confirm the exact week you can book.",
    };
  }
  return {
    label: "Points",
    description: "You book stays with a points balance instead of a fixed owned week.",
  };
}

export function getStayLength(checkInDate: string, checkOutDate: string) {
  if (!checkInDate || !checkOutDate) return 0;
  const start = new Date(`${checkInDate}T00:00:00`).getTime();
  const end = new Date(`${checkOutDate}T00:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

export function getIsoWeekLabel(dateValue: string) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `Week ${weekNo}`;
}

export function getSavingsPercentage(ownerPriceCents: number, normalPriceCents: number) {
  if (!ownerPriceCents || !normalPriceCents || ownerPriceCents >= normalPriceCents) return 0;
  return Math.round(((normalPriceCents - ownerPriceCents) / normalPriceCents) * 100);
}

export function toggleAmenity(current: AmenityOption[], value: AmenityOption) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}
