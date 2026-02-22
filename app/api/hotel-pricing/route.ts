import { NextResponse } from "next/server";

type LookupPayload = {
  destination?: string;
  resortName?: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
};

function parseUsdNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function collectPriceCandidates(node: unknown, out: number[]) {
  if (node === null || node === undefined) return;

  const parsed = parseUsdNumber(node);
  if (parsed !== null) {
    out.push(parsed);
  }

  if (Array.isArray(node)) {
    node.forEach((value) => collectPriceCandidates(value, out));
    return;
  }

  if (typeof node === "object") {
    Object.values(node as Record<string, unknown>).forEach((value) =>
      collectPriceCandidates(value, out)
    );
  }
}

function validDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LookupPayload;
    const destination = payload.destination?.trim() || payload.resortName?.trim();
    const checkIn = payload.checkIn?.trim();
    const checkOut = payload.checkOut?.trim();
    const adults = Math.max(1, Math.min(8, Number(payload.adults) || 2));

    if (!destination || !validDate(checkIn) || !validDate(checkOut)) {
      return NextResponse.json(
        { error: "destination, checkIn, and checkOut are required." },
        { status: 400 }
      );
    }

    const safeCheckIn = checkIn as string;
    const safeCheckOut = checkOut as string;

    if (safeCheckOut <= safeCheckIn) {
      return NextResponse.json(
        { error: "checkOut must be after checkIn." },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Hotel pricing provider is not configured." },
        { status: 503 }
      );
    }

    const query = new URLSearchParams({
      engine: "google_hotels",
      q: payload.country ? `${destination}, ${payload.country}` : destination,
      check_in_date: safeCheckIn,
      check_out_date: safeCheckOut,
      adults: String(adults),
      currency: "USD",
      gl: "us",
      hl: "en",
      api_key: apiKey,
    });

    const response = await fetch(`https://serpapi.com/search.json?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Hotel pricing provider request failed." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const candidates: number[] = [];

    collectPriceCandidates((data as { properties?: unknown }).properties, candidates);
    collectPriceCandidates((data as { hotels?: unknown }).hotels, candidates);
    collectPriceCandidates((data as { prices?: unknown }).prices, candidates);

    const filtered = candidates.filter((value) => value >= 40 && value <= 50000);
    if (filtered.length === 0) {
      return NextResponse.json(
        { error: "No hotel price found for these dates." },
        { status: 404 }
      );
    }

    const nightlyUsd = Math.round(Math.min(...filtered));
    const nights =
      Math.max(
        1,
        Math.round(
          (new Date(`${safeCheckOut}T00:00:00`).getTime() -
            new Date(`${safeCheckIn}T00:00:00`).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ) || 1;

    return NextResponse.json({
      nightlyUsd,
      totalUsd: nightlyUsd * nights,
      nights,
      source: "serpapi/google_hotels",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch hotel pricing right now." },
      { status: 500 }
    );
  }
}
