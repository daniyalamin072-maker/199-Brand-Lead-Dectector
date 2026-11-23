export type Lead = {
  name: string;
  phone: string;
  address: string;
  website: "None";
  google_rating: number | null;
  review_count: number | null;
  business_status: string | null;
  source?: "openstreetmap" | "google";
  city?: string;
  country?: string;
};
export type ContactedLead = Lead & { business_key: string; contacted_at: string };

export const NICHES = ["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician", "Solar", "House Cleaning"] as const;
export type Niche = (typeof NICHES)[number];

type TagFilter = { tag: string; value: string } | { namePattern: string };
export const NICHE_OSM_FILTERS: Record<Niche, TagFilter[]> = {
  Plumbing: [
    { tag: "craft", value: "plumber" }, { tag: "shop", value: "plumber" },
    { tag: "craft", value: "heating_engineer" }, { namePattern: "plumb" },
  ],
  HVAC: [
    { tag: "craft", value: "hvac" }, { tag: "craft", value: "heating_engineer" },
    { tag: "shop", value: "hvac" }, { namePattern: "hvac|air conditioning|heating" },
  ],
  Landscaping: [
    { tag: "craft", value: "gardener" }, { tag: "shop", value: "garden_centre" },
    { tag: "leisure", value: "garden" }, { namePattern: "landscap|lawn|tree|garden" },
  ],
  Roofing: [
    { tag: "craft", value: "roofer" }, { tag: "shop", value: "roofing" }, { namePattern: "roof" },
  ],
  Electrician: [
    { tag: "craft", value: "electrician" }, { tag: "shop", value: "electrical" }, { namePattern: "electric" },
  ],
  Solar: [
    { tag: "craft", value: "solar" }, { tag: "shop", value: "solar" }, { namePattern: "solar" },
  ],
  "House Cleaning": [
    { tag: "shop", value: "cleaning" }, { tag: "office", value: "cleaning" },
    { namePattern: "clean|maid|janitor" },
  ],
};

export const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const phoneDigits = (phone: string) => phone.replace(/\D/g, "");
export const businessKey = (lead: Pick<Lead, "name" | "address">) => `${normalize(lead.name)}|${normalize(lead.address)}`;
export const mapsUrl = (lead: Lead, city = lead.city ?? "", country = lead.country ?? "") =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + " " + lead.address + " " + city + " " + country)}`;

export const MIN_RATING = 4.0;
export const MIN_REVIEWS = 15;
const validRating = (value: number | null) => value === null || (Number.isFinite(value) && value >= MIN_RATING && value <= 5);
const validReviewCount = (value: number | null) => value === null || (Number.isSafeInteger(value) && value >= MIN_REVIEWS);

/** OSM does not consistently carry ratings or operating status; validate only fields it actually provides. */
export function meetsQuality(lead: Lead): boolean {
  if (lead.source === "openstreetmap" || lead.business_status === "OSM_LISTED") {
    return lead.business_status === "OSM_LISTED" && validRating(lead.google_rating) && validReviewCount(lead.review_count);
  }
  return typeof lead.google_rating === "number" && validRating(lead.google_rating)
    && typeof lead.review_count === "number" && validReviewCount(lead.review_count)
    && lead.business_status === "ACTIVE";
}

export const displayableLeads = <T extends Lead>(leads: T[]): T[] =>
  leads.filter(lead => lead.website === "None" && meetsQuality(lead));

export type OsmElement = {
  type?: "node" | "way" | "relation";
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

export type SearchScope = { city: string; country: string };

const value = (tags: Record<string, string | undefined>, key: string) => tags[key]?.trim() ?? "";
function firstNumber(tags: Record<string, string | undefined>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = value(tags, key);
    if (!raw) continue;
    const parsed = Number(raw.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatAddress(tags: Record<string, string | undefined>, scope: SearchScope): string {
  const houseNumber = value(tags, "addr:housenumber");
  const street = value(tags, "addr:street");
  const hasStreet = Boolean(houseNumber || street);
  if (!hasStreet) return `${scope.city}, ${scope.country}`;

  const parts = [
    [houseNumber, street].filter(Boolean).join(" "),
    value(tags, "addr:suburb"),
    value(tags, "addr:city") || scope.city,
    value(tags, "addr:postcode"),
    scope.country,
  ].filter(Boolean);
  return parts.filter((part, index) => parts.findIndex(candidate => normalize(candidate) === normalize(part)) === index).join(", ");
}

function hasWebsite(tags: Record<string, string | undefined>): boolean {
  return ["website", "contact:website", "url"].some(key => value(tags, key).length > 0);
}

export function osmElementToLead(element: OsmElement, scope: SearchScope): Lead | null {
  const tags = element.tags ?? {};
  const name = value(tags, "name");
  if (!name || hasWebsite(tags)) return null;

  const phone = value(tags, "phone") || value(tags, "contact:phone") || value(tags, "contact:mobile") || "Not listed";
  const lead: Lead = {
    name,
    phone,
    address: formatAddress(tags, scope),
    website: "None",
    google_rating: firstNumber(tags, ["rating", "rating:stars", "stars"]),
    review_count: firstNumber(tags, ["user_ratings_total", "review_count", "reviews"]),
    business_status: "OSM_LISTED",
    source: "openstreetmap",
    city: scope.city,
    country: scope.country,
  };
  return meetsQuality(lead) ? lead : null;
}

export function buildOverpassQuery(niche: Niche, lat: number, lon: number, radius: number): string {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error("Invalid OpenStreetMap search coordinates.");
  }
  if (!Number.isSafeInteger(radius) || radius <= 0) throw new Error("Invalid OpenStreetMap search radius.");
  const filters = NICHE_OSM_FILTERS[niche];
  const queries = filters.map(filter => {
    const selector = "tag" in filter
      ? `["${filter.tag}"="${filter.value}"]`
      : `[name~"${filter.namePattern}",i]`;
    return `nwr(around:${radius},${lat},${lon})${selector};`;
  });
  return `[out:json][timeout:25];(\n${queries.join("\n")}\n);out center tags;`;
}

/** Remove unqualified records, previously contacted businesses, and batch duplicates by name/address or listed phone. */
export function activeLeads(leads: Lead[], history: Lead[]): Lead[] {
  const keys = new Set(history.map(businessKey));
  const phones = new Set(history.map(lead => phoneDigits(lead.phone)).filter(Boolean));
  return leads.filter(lead => {
    const key = businessKey(lead);
    const phone = phoneDigits(lead.phone);
    if (lead.website !== "None" || !meetsQuality(lead) || keys.has(key) || (phone && phones.has(phone))) return false;
    keys.add(key);
    if (phone) phones.add(phone);
    return true;
  });
}