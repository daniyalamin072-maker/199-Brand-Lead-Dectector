export type Lead = { name: string; phone: string; address: string; website: "None"; google_rating: number | null; review_count: number | null; business_status: string | null; place_id?: string };
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
export const mapsUrl = (lead: Lead) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name}, ${lead.address}`.trim())}`
  + (lead.place_id ? `&query_place_id=${encodeURIComponent(lead.place_id)}` : "");
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
  nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string;
  rating?: number; userRatingCount?: number; businessStatus?: string;
};
// Fail closed: any website on the real listing, missing name/phone/address, or weak quality rejects it.
export function placeToLead(place: Place): Lead | null {
  if (typeof place.websiteUri === "string" && place.websiteUri.trim() !== "") return null;
  if ("websiteUri" in place && place.websiteUri !== undefined && place.websiteUri !== null && typeof place.websiteUri !== "string") return null;
  const name = place.displayName?.text?.trim() ?? "";
  const phone = (place.internationalPhoneNumber || place.nationalPhoneNumber || "").trim();
  const address = place.formattedAddress?.trim() ?? "";
  if (!name || !address || digits(phone).length < 6 || !place.id) return null;
  const lead: Lead = {
    name, phone, address, website: "None", place_id: place.id,
    google_rating: typeof place.rating === "number" ? place.rating : null,
    review_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    business_status: place.businessStatus === "OPERATIONAL" ? "ACTIVE" : place.businessStatus ?? null,
  };
  return meetsQuality(lead) ? lead : null;
}
// Drops unqualified leads, contacted history, and duplicates by business name or phone number.
export function activeLeads(leads: Lead[], history: Lead[]): Lead[] {
  const keys = new Set(history.map(businessKey));
  const names = new Set<string>();
  const phones = new Set(history.map(l => digits(l.phone)).filter(Boolean));
  return leads.filter(lead => {
    const key = businessKey(lead), name = normalize(lead.name), phone = digits(lead.phone);
    if (lead.website !== "None" || !meetsQuality(lead) || keys.has(key) || names.has(name) || (phone && phones.has(phone))) return false;
    keys.add(key); names.add(name);
    if (phone) phones.add(phone);
    return true;
  });
}
