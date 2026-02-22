type DestinationInputProps = {
  defaultValue?: string;
  name?: string;
  inputId?: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
};

const DESTINATION_OPTIONS = [
  // US - Florida / Southeast
  "Orlando",
  "Kissimmee",
  "Lake Buena Vista",
  "Miami",
  "Miami Beach",
  "Fort Lauderdale",
  "Palm Beach",
  "Naples, Florida",
  "Key West",
  "Destin",
  "Panama City Beach",
  "Clearwater Beach",
  "St. Pete Beach",
  "Tampa",
  "Sarasota",
  "Daytona Beach",
  "Myrtle Beach",
  "Hilton Head Island",
  "Charleston",
  "Savannah",
  "Gatlinburg",
  "Pigeon Forge",
  "Nashville",
  "New Orleans",

  // US - West / Southwest
  "Las Vegas",
  "Scottsdale",
  "Phoenix",
  "Sedona",
  "Palm Springs",
  "San Diego",
  "Anaheim",
  "Los Angeles",
  "Santa Barbara",
  "Monterey",
  "Lake Tahoe",
  "San Francisco",
  "Napa",
  "Carmel",
  "Branson",
  "Park City",
  "St. George, Utah",
  "Denver",
  "Breckenridge",
  "Vail",
  "Aspen",

  // Hawaii
  "Honolulu",
  "Oahu",
  "Waikiki",
  "Maui",
  "Kaanapali",
  "Kihei",
  "Wailea",
  "Kauai",
  "Princeville",
  "Poipu",
  "Big Island",
  "Kona",
  "Waikoloa",

  // Mexico / Caribbean / Central America
  "Cabo San Lucas",
  "San Jose del Cabo",
  "Puerto Vallarta",
  "Nuevo Vallarta",
  "Riviera Maya",
  "Cancun",
  "Playa del Carmen",
  "Cozumel",
  "Tulum",
  "Mazatlan",
  "Punta Cana",
  "Cap Cana",
  "La Romana",
  "Puerto Plata",
  "Montego Bay",
  "Negril",
  "Ocho Rios",
  "Aruba",
  "Palm Beach, Aruba",
  "Curacao",
  "St. Thomas",
  "St. Maarten",
  "Nassau",
  "Paradise Island",
  "Turks and Caicos",
  "Ambergris Caye",
  "Costa Rica",
  "Guanacaste",
  "Tamarindo",

  // Canada
  "Toronto",
  "Niagara Falls",
  "Vancouver",
  "Whistler",
  "Victoria, BC",
  "Kelowna",
  "Calgary",
  "Banff",
  "Canmore",
  "Jasper",
  "Edmonton",
  "Montreal",
  "Quebec City",
  "Ottawa",
  "Halifax",

  // Europe
  "London",
  "Paris",
  "Rome",
  "Florence",
  "Venice",
  "Barcelona",
  "Madrid",
  "Lisbon",
  "Algarve",
  "Dublin",
  "Edinburgh",
  "Amsterdam",
  "Prague",
  "Vienna",
  "Athens",
  "Santorini",
  "Mykonos",
  "Canary Islands",
  "Tenerife",

  // Asia / Pacific
  "Tokyo",
  "Osaka",
  "Kyoto",
  "Bangkok",
  "Phuket",
  "Bali",
  "Singapore",
  "Sydney",
  "Melbourne",
  "Gold Coast",
  "Auckland",
  "Queenstown",

  // Resort / brand style search terms
  "Marriott Vacation Club",
  "Hilton Grand Vacations",
  "Wyndham",
  "WorldMark",
  "Bluegreen",
  "Westgate",
  "Holiday Inn Club Vacations",
  "Disney Vacation Club",
  "RCI",
  "Interval International",
];

export default function DestinationInput({
  defaultValue,
  name = "q",
  inputId,
  options = [],
  placeholder = "Orlando, Maui, Marriott...",
  required = false,
  className = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm",
  labelClassName = "block text-xs font-medium text-zinc-700",
}: DestinationInputProps) {
  const listId = `${name}-destination-options`;
  const mergedOptions: string[] = [];
  const seen = new Set<string>();

  for (const option of [...options, ...DESTINATION_OPTIONS]) {
    const normalized = option.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    mergedOptions.push(option);
  }

  return (
    <label className={labelClassName}>
      Destination or resort
      <input
        id={inputId}
        className={className}
        defaultValue={defaultValue}
        list={listId}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      <datalist id={listId}>
        {mergedOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
