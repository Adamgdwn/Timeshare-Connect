import { createServerClient } from "@/lib/supabase/server";

type ListingSuggestionRow = {
  city: string | null;
  country: string | null;
  resort_name: string | null;
};

export async function getDestinationSuggestions() {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("listings")
    .select("city,country,resort_name")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as ListingSuggestionRow[];
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const candidates = [
      row.resort_name?.trim() || "",
      row.city?.trim() || "",
      row.city && row.country ? `${row.city.trim()}, ${row.country.trim()}` : "",
    ];

    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase();
      if (!candidate || seen.has(normalized)) continue;
      seen.add(normalized);
      suggestions.push(candidate);
    }
  }

  return suggestions.sort((a, b) => a.localeCompare(b));
}

