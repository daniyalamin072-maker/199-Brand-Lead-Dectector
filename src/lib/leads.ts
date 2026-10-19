export type Lead = { name: string; phone: string; address: string; website: "None"; google_rating: number | null; review_count: number | null; business_status: string | null; place_id?: string; city?: string };
export type ContactedLead = Lead & { business_key: string; contacted_at: string };
export const NICHES = ["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician"] as const;
// Google Maps search phrases per niche; several phrasings surface more real listings.
export const NICHE_QUERIES: Record<string, string[]> = {
  Plumbing: ["plumber", "plumbing service", "emergency plumber"],
  HVAC: ["HVAC contractor", "air conditioning repair", "heating contractor"],
  Landscaping: ["landscaper", "lawn care service", "landscaping company"],
  Roofing: ["roofing contractor", "roofer", "roof repair"],
  Electrician: ["electrician", "electrical contractor", "emergency electrician"],
};
export const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const digits = (phone: string) => phone.replace(/\D/g, "");
export const businessKey = (lead: Lead) => `${normalize(lead.name)}|${normalize(lead.address)}`;
export const mapsUrl = (lead: Lead, city = lead.city ?? "") =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + lead.address + ' ' + city)}`;
export function meetsQuality(lead: Lead): boolean {
  return typeof lead.google_rating === "number" && Number.isFinite(lead.google_rating)
    && lead.google_rating >= 4.0 && lead.google_rating <= 5.0
    && typeof lead.review_count === "number" && Number.isSafeInteger(lead.review_count)
    && lead.review_count >= 20 && lead.business_status === "ACTIVE";
}
export const displayableLeads = <T extends Lead>(leads: T[]): T[] =>
  leads.filter(lead => lead.website === "None" && meetsQuality(lead));

/** Raw Google Places (New) listing fields we request. */
export type Place = {
  id?: string; displayName?: { text?: string }; formattedAddress?: string;
  nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string | null;
  rating?: number; userRatingCount?: number; businessStatus?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
};
export type SearchScope = { city: string; country: string };
export function matchesLocation(place: Place, scope: SearchScope): boolean {
  const parts = place.addressComponents ?? [];
  const cities = parts.filter(p => p.types?.some(t => ["locality", "postal_town", "administrative_area_level_3"].includes(t)));
  const country = parts.find(p => p.types?.includes("country"));
  if (!country || !cities.some(p => [p.longText, p.shortText].some(v => v && normalize(v) === normalize(scope.city)))) return false;
  const aliases: Record<string, string[]> = { US: ["USA", "United States of America"], GB: ["UK", "United Kingdom", "Great Britain"] };
  return [country.longText, country.shortText, ...(aliases[country.shortText ?? ""] ?? [])]
    .some(value => value && normalize(value) === normalize(scope.country));
}
// Fail closed: any website on the real listing, missing name/phone/address, or weak quality rejects it.
export function placeToLead(place: Place, scope?: SearchScope): Lead | null {
  if (place.websiteUri !== undefined && place.websiteUri !== null && place.websiteUri !== "") return null;
  if (scope && !matchesLocation(place, scope)) return null;
  const name = place.displayName?.text?.trim() ?? "";
  const phone = (place.internationalPhoneNumber || place.nationalPhoneNumber || "").trim();
  const address = place.formattedAddress?.trim() ?? "";
  if (!name || !address || digits(phone).length < 6 || !place.id) return null;
  const lead: Lead = {
    name, phone, address, website: "None", place_id: place.id,
    city: scope?.city ?? place.addressComponents?.find(p => p.types?.some(t => t === "locality" || t === "postal_town"))?.longText,
    google_rating: typeof place.rating === "number" ? place.rating : null,
    review_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    business_status: place.businessStatus === "OPERATIONAL" ? "ACTIVE" : place.businessStatus ?? null,
  };
  return meetsQuality(lead) ? lead : null;
}
// Drops unqualified leads, contacted history, and duplicates by business name or phone number.
export function activeLeads(leads: Lead[], history: Lead[]): Lead[] {
  const keys = new Set(history.map(businessKey));
  const names = new Set(history.map(l => normalize(l.name)));
  const phones = new Set(history.map(l => digits(l.phone)).filter(Boolean));
  return leads.filter(lead => {
    const key = businessKey(lead), name = normalize(lead.name), phone = digits(lead.phone);
    if (lead.website !== "None" || !meetsQuality(lead) || keys.has(key) || names.has(name) || (phone && phones.has(phone))) return false;
    keys.add(key); names.add(name);
    if (phone) phones.add(phone);
    return true;
  });
}
