export type AvailabilityMode = "exact" | "flex";

export function formatShortDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getNightCount(checkInDate: string | null | undefined, checkOutDate: string | null | undefined) {
  if (!checkInDate || !checkOutDate) return 0;
  const start = new Date(`${checkInDate}T00:00:00`).getTime();
  const end = new Date(`${checkOutDate}T00:00:00`).getTime();
  const diff = end - start;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function formatListingDateSummary(listing: {
  availability_mode?: AvailabilityMode | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  available_start_date?: string | null;
  available_end_date?: string | null;
  minimum_nights?: number | null;
  maximum_nights?: number | null;
}) {
  if ((listing.availability_mode ?? "exact") === "flex") {
    const range = `${formatShortDate(listing.available_start_date)} to ${formatShortDate(listing.available_end_date)}`;
    const minNights = listing.minimum_nights ?? 1;
    const maxNights = listing.maximum_nights ?? null;
    const nightsLabel = maxNights && maxNights !== minNights ? `${minNights}-${maxNights} nights` : `${minNights} night${minNights === 1 ? "" : "s"}+`;
    return `Flexible within ${range} (${nightsLabel})`;
  }

  const nights = getNightCount(listing.check_in_date, listing.check_out_date);
  return `${formatShortDate(listing.check_in_date)} to ${formatShortDate(listing.check_out_date)}${nights ? ` (${nights} nights)` : ""}`;
}

export function formatRequestedStaySummary(offer: {
  desired_check_in_date?: string | null;
  desired_check_out_date?: string | null;
}) {
  if (!offer.desired_check_in_date || !offer.desired_check_out_date) return "Exact listing dates";
  const nights = getNightCount(offer.desired_check_in_date, offer.desired_check_out_date);
  return `${formatShortDate(offer.desired_check_in_date)} to ${formatShortDate(offer.desired_check_out_date)}${nights ? ` (${nights} nights)` : ""}`;
}

export function matchesTravelerDates(args: {
  availabilityMode: AvailabilityMode;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  availableStartDate?: string | null;
  availableEndDate?: string | null;
  minimumNights?: number | null;
  maximumNights?: number | null;
}) {
  const {
    availabilityMode,
    requestedCheckIn,
    requestedCheckOut,
    checkInDate,
    checkOutDate,
    availableStartDate,
    availableEndDate,
    minimumNights,
    maximumNights,
  } = args;

  if (!requestedCheckIn && !requestedCheckOut) return true;

  if (availabilityMode === "exact") {
    if (requestedCheckIn && requestedCheckOut) {
      return Boolean(checkInDate && checkOutDate && checkInDate <= requestedCheckOut && checkOutDate >= requestedCheckIn);
    }
    if (requestedCheckIn) {
      return Boolean(checkOutDate && checkOutDate >= requestedCheckIn);
    }
    if (requestedCheckOut) {
      return Boolean(checkInDate && checkInDate <= requestedCheckOut);
    }
    return true;
  }

  if (!requestedCheckIn || !requestedCheckOut || !availableStartDate || !availableEndDate) {
    return true;
  }

  const requestedNights = getNightCount(requestedCheckIn, requestedCheckOut);
  if (requestedNights <= 0) return false;

  const minNights = minimumNights ?? 1;
  const maxNights = maximumNights ?? null;

  return (
    requestedCheckIn >= availableStartDate &&
    requestedCheckOut <= availableEndDate &&
    requestedNights >= minNights &&
    (!maxNights || requestedNights <= maxNights)
  );
}
