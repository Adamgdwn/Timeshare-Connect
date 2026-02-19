"use client";

import { useId, useMemo } from "react";

type LocationRow = {
  city: string;
  country: string;
};

type CityCountryLookupProps = {
  city: string;
  country: string;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  requiredCity?: boolean;
};

const LOCATIONS: LocationRow[] = [
  { city: "Orlando", country: "United States" },
  { city: "Kissimmee", country: "United States" },
  { city: "Las Vegas", country: "United States" },
  { city: "Myrtle Beach", country: "United States" },
  { city: "Honolulu", country: "United States" },
  { city: "Maui", country: "United States" },
  { city: "Miami", country: "United States" },
  { city: "San Diego", country: "United States" },
  { city: "Scottsdale", country: "United States" },
  { city: "Palm Springs", country: "United States" },
  { city: "Nashville", country: "United States" },
  { city: "Phoenix", country: "United States" },
  { city: "Branson", country: "United States" },
  { city: "Williamsburg", country: "United States" },
  { city: "Cancun", country: "Mexico" },
  { city: "Puerto Vallarta", country: "Mexico" },
  { city: "Cabo San Lucas", country: "Mexico" },
  { city: "Punta Cana", country: "Dominican Republic" },
  { city: "Montego Bay", country: "Jamaica" },
  { city: "Nassau", country: "Bahamas" },
  { city: "Aruba", country: "Aruba" },
  { city: "St. Thomas", country: "US Virgin Islands" },
  { city: "Paris", country: "France" },
  { city: "London", country: "United Kingdom" },
  { city: "Barcelona", country: "Spain" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Rome", country: "Italy" },
  { city: "Athens", country: "Greece" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "Tokyo", country: "Japan" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Sydney", country: "Australia" },
  { city: "Vancouver", country: "Canada" },
  { city: "Whistler", country: "Canada" },
  { city: "Toronto", country: "Canada" },
];

export default function CityCountryLookup({
  city,
  country,
  onCityChange,
  onCountryChange,
  requiredCity = true,
}: CityCountryLookupProps) {
  const cityListId = useId();
  const countryListId = useId();

  const citySuggestions = useMemo(() => {
    const cityNeedle = city.trim().toLowerCase();
    const countryNeedle = country.trim().toLowerCase();
    const filtered = LOCATIONS.filter((row) => {
      const cityMatch = cityNeedle ? row.city.toLowerCase().includes(cityNeedle) : true;
      const countryMatch = countryNeedle ? row.country.toLowerCase().includes(countryNeedle) : true;
      return cityMatch && countryMatch;
    });
    return filtered.slice(0, 12);
  }, [city, country]);

  const countrySuggestions = useMemo(() => {
    const countries = Array.from(new Set(LOCATIONS.map((row) => row.country)));
    const needle = country.trim().toLowerCase();
    return countries.filter((value) => (needle ? value.toLowerCase().includes(needle) : true)).slice(0, 12);
  }, [country]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        City
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          list={cityListId}
          placeholder="Start typing city"
          required={requiredCity}
          value={city}
          onChange={(e) => {
            const raw = e.target.value;
            onCityChange(raw);

            const matched = LOCATIONS.find((row) => row.city.toLowerCase() === raw.trim().toLowerCase());
            if (matched && !country.trim()) {
              onCountryChange(matched.country);
            }
          }}
        />
        <datalist id={cityListId}>
          {citySuggestions.map((row) => (
            <option key={`${row.city}-${row.country}`} value={row.city}>
              {row.country}
            </option>
          ))}
        </datalist>
      </label>

      <label className="block text-sm">
        Country
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          list={countryListId}
          placeholder="Start typing country"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
        />
        <datalist id={countryListId}>
          {countrySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </label>
    </div>
  );
}

