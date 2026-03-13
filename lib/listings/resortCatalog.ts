export const AMENITY_OPTIONS = [
  "pool",
  "beach access",
  "ocean view",
  "full kitchen",
  "washer/dryer",
  "balcony",
  "spa",
  "golf",
  "wifi",
  "pet friendly",
  "adults only",
  "parking",
] as const;

export type AmenityOption = (typeof AMENITY_OPTIONS)[number];

export type ResortCatalogItem = {
  key: string;
  name: string;
  city: string;
  country: string;
  brand?: string;
  bookingBaseUrl?: string;
  photos: string[];
  amenities: AmenityOption[];
  defaultDescription: string;
  defaultUnitTypes: string[];
};

export const RESORT_CATALOG: ResortCatalogItem[] = [
  {
    key: "marriott-maui-ocean-club-lahaina",
    name: "Marriott's Maui Ocean Club",
    city: "Lahaina",
    country: "United States",
    brand: "Marriott Vacation Club",
    bookingBaseUrl: "https://www.marriottvacationclub.com",
    photos: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "beach access", "ocean view", "full kitchen", "spa", "wifi", "balcony"],
    defaultDescription:
      "Beachfront Maui stay with resort pools, spacious villa living, and easy access to Ka'anapali dining and snorkeling.",
    defaultUnitTypes: ["1 bedroom", "2 bedroom", "3 bedroom"],
  },
  {
    key: "wyndham-bonnet-creek-orlando",
    name: "Club Wyndham Bonnet Creek",
    city: "Orlando",
    country: "United States",
    brand: "Club Wyndham",
    bookingBaseUrl: "https://clubwyndham.wyndhamdestinations.com",
    photos: [
      "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "full kitchen", "washer/dryer", "balcony", "wifi", "parking", "spa"],
    defaultDescription:
      "Family-friendly Orlando resort close to Disney with lazy rivers, roomy villas, and full-kitchen convenience.",
    defaultUnitTypes: ["1 bedroom", "2 bedroom", "3 bedroom", "lockoff"],
  },
  {
    key: "hilton-grand-vacations-elara-las-vegas",
    name: "Hilton Grand Vacations Club Elara Center Strip Las Vegas",
    city: "Las Vegas",
    country: "United States",
    brand: "Hilton Grand Vacations",
    bookingBaseUrl: "https://www.hiltongrandvacations.com",
    photos: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "full kitchen", "wifi", "parking", "spa"],
    defaultDescription:
      "Center Strip tower stay with oversized suites, easy entertainment access, and resort-style pool time between shows.",
    defaultUnitTypes: ["studio", "1 bedroom", "2 bedroom"],
  },
  {
    key: "vidanta-riviera-maya-playa-del-carmen",
    name: "Vidanta Riviera Maya",
    city: "Playa del Carmen",
    country: "Mexico",
    brand: "Vidanta",
    bookingBaseUrl: "https://www.vidanta.com",
    photos: [
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "beach access", "ocean view", "full kitchen", "spa", "golf", "wifi", "balcony"],
    defaultDescription:
      "Riviera Maya resort stay with beach access, lush pools, and spacious suites suited for family beach trips.",
    defaultUnitTypes: ["studio", "1 bedroom", "2 bedroom"],
  },
  {
    key: "westin-kaanapali-ocean-resort-villas-lahaina",
    name: "The Westin Ka'anapali Ocean Resort Villas",
    city: "Lahaina",
    country: "United States",
    brand: "Vistana",
    bookingBaseUrl: "https://www.vistana.com",
    photos: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "beach access", "ocean view", "full kitchen", "washer/dryer", "balcony", "wifi", "spa"],
    defaultDescription:
      "Ka'anapali villa stay with oceanfront grounds, kitchen-equipped units, and resort pools ideal for multi-night escapes.",
    defaultUnitTypes: ["studio", "1 bedroom", "2 bedroom"],
  },
  {
    key: "bluegreen-horizon-at-77th-myrtle-beach",
    name: "Bluegreen Vacations Horizon at 77th",
    city: "Myrtle Beach",
    country: "United States",
    brand: "Bluegreen Vacations",
    bookingBaseUrl: "https://www.bluegreenvacations.com",
    photos: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "beach access", "ocean view", "full kitchen", "washer/dryer", "balcony", "wifi", "parking"],
    defaultDescription:
      "Myrtle Beach villa stay with roomy family layouts, beach proximity, and practical in-unit amenities for weeklong travel.",
    defaultUnitTypes: ["1 bedroom", "2 bedroom", "3 bedroom"],
  },
  {
    key: "four-seasons-residence-club-aviara-carlsbad",
    name: "Four Seasons Residence Club Aviara",
    city: "Carlsbad",
    country: "United States",
    brand: "Four Seasons",
    bookingBaseUrl: "https://www.fourseasons.com",
    photos: [
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    amenities: ["pool", "spa", "golf", "full kitchen", "washer/dryer", "wifi", "parking", "balcony"],
    defaultDescription:
      "Upscale North County San Diego residence club stay with villa space, golf access, and a polished resort setting.",
    defaultUnitTypes: ["1 bedroom", "2 bedroom"],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getResortCatalogByKey(key: string) {
  return RESORT_CATALOG.find((item) => item.key === key) ?? null;
}

export function findResortCatalogMatches(query: string, limit = 6) {
  const needle = normalize(query);
  if (!needle) return RESORT_CATALOG.slice(0, limit);

  return RESORT_CATALOG.filter((item) => {
    const haystack = [item.name, item.city, item.country, item.brand ?? ""].map(normalize).join(" ");
    return haystack.includes(needle);
  }).slice(0, limit);
}

export function inferResortCatalogItem({
  resortName,
  city,
}: {
  resortName?: string | null;
  city?: string | null;
}) {
  const resortNeedle = normalize(resortName ?? "");
  const cityNeedle = normalize(city ?? "");

  if (!resortNeedle && !cityNeedle) return null;

  return (
    RESORT_CATALOG.find((item) => normalize(item.name) === resortNeedle && (!cityNeedle || normalize(item.city) === cityNeedle)) ??
    RESORT_CATALOG.find((item) => resortNeedle && normalize(item.name).includes(resortNeedle)) ??
    null
  );
}

export function getResortCatalogSuggestions() {
  const suggestions = new Set<string>();

  for (const item of RESORT_CATALOG) {
    suggestions.add(item.name);
    suggestions.add(item.city);
    suggestions.add(`${item.city}, ${item.country}`);
  }

  return Array.from(suggestions).sort((a, b) => a.localeCompare(b));
}
