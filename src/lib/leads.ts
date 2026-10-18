export type Lead = { name: string; phone: string; address: string; website: "None"; google_rating: number | null; review_count: number | null; business_status: string | null };
export type ContactedLead = Lead & { business_key: string; contacted_at: string };
export const NICHES = ["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician"] as const;
const PREFIX = ["Apex", "Prime", "Summit", "Reliable", "Metro", "Blue Line", "Ironclad", "Northstar", "Peak", "Allied", "Express", "Precision"];
const SUFFIX: Record<string, string[]> = {
  Plumbing: ["Plumbing Co.", "Pipe Works", "Drain Pros"],
  HVAC: ["Heating & Air", "HVAC Services", "Climate Control"],
  Landscaping: ["Landscaping", "Lawn Care", "Garden & Tree Co."],
  Roofing: ["Roofing Co.", "Roof & Gutter Pros", "Shingle Works"],
  Electrician: ["Electric Co.", "Electrical Services", "Volt Masters"],
};
const STREETS = ["Main St", "Oak Ave", "Market St", "Elm Rd", "Park Blvd", "King St", "River Dr"];
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export const businessKey = (lead: Lead) => `${normalize(lead.name)}|${normalize(lead.address)}`;
// Clickable Google Maps search built from the business name plus its street, city and country.
export const mapsUrl = (lead: Lead) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name}, ${lead.address}`.trim())}`;
export function meetsQuality(lead: Lead): boolean {
  return typeof lead.google_rating === "number" && Number.isFinite(lead.google_rating)
    && lead.google_rating >= 4.0 && lead.google_rating <= 5.0
    && typeof lead.review_count === "number" && Number.isSafeInteger(lead.review_count)
    && lead.review_count >= 20 && lead.business_status === "ACTIVE";
}
export const displayableLeads = <T extends Lead>(leads: T[]): T[] =>
  leads.filter(lead => lead.website === "None" && meetsQuality(lead));
export function activeLeads(leads: Lead[], history: Lead[]): Lead[] {
  const keys = new Set(history.map(businessKey));
  const phones = new Set(history.map(l => l.phone.replace(/\D/g, "")).filter(Boolean));
  return leads.filter(lead => {
    const key = businessKey(lead);
    const phone = lead.phone.replace(/\D/g, "");
    if (lead.website !== "None" || !meetsQuality(lead) || keys.has(key) || (phone && phones.has(phone))) return false;
    keys.add(key);
    if (phone) phones.add(phone);
    return true;
  });
}
// Stable mock records: repeated searches resolve to the same businesses, not new random identities.
export function generate(city: string, country: string, niche: string, history: Lead[] = []): Lead[] {
  const location = `${normalize(city)}|${normalize(country)}`;
  let hash = 0;
  for (const character of location) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const suffixes = SUFFIX[niche] ?? ["Services"];
  const candidates = Array.from({ length: 10000 }, (_, i): Lead => ({
    name: `${PREFIX[i % PREFIX.length]} ${suffixes[Math.floor(i / PREFIX.length) % suffixes.length]} — ${Math.floor(i / 36) + 1}`,
    phone: `+1 ${String(2000000000 + ((hash % 7000) * 100000) + (Math.max(0, NICHES.indexOf(niche as typeof NICHES[number])) * 10000) + i)}`,
    address: `${10 + i} ${STREETS[i % STREETS.length]}, ${city.trim()}, ${country.trim()}`,
    website: "None",
    // Sample quality data, not verified Google data. Invalid candidates are discarded below.
    google_rating: (35 + i % 16) / 10,
    review_count: 10 + i % 191,
    business_status: i % 13 === 0 ? "CLOSED" : "ACTIVE",
  }));
  return activeLeads(candidates, history).slice(0, 120 + Math.floor(Math.random() * 60));
}