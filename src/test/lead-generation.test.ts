import { describe, expect, it } from "vitest";
import { activeLeads, businessKey, displayableLeads, mapsUrl, meetsQuality, matchesLocation, NICHES, NICHE_QUERIES, placeToLead, type Place } from "@/lib/leads";

const place: Place = {
  id: "real-listing-id", displayName: { text: "Quality Plumbing" },
  formattedAddress: "10 Main St, Austin, TX, USA", internationalPhoneNumber: "+1 512 234 5678",
  rating: 4.0, userRatingCount: 20, businessStatus: "OPERATIONAL",
  addressComponents: [
    { longText: "Austin", types: ["locality"] },
    { longText: "United States", shortText: "US", types: ["country"] },
  ],
};
const qualityLead = { name: "Quality Plumbing", address: "10 Main St, Austin, USA", phone: "+1 5122345678", website: "None" as const, google_rating: 4.0, review_count: 20, business_status: "ACTIVE", city: "Austin" };

describe("Real lead validation", () => {
  it("offers exactly five separate home-service niches", () => {
    expect(NICHES).toEqual(["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician"]);
    for (const niche of NICHES) expect(NICHE_QUERIES[niche]?.length).toBe(3);
  });
  it("preserves actual listing identity and maps operating status to ACTIVE", () => {
    expect(placeToLead(place, { city: "Austin", country: "USA" })).toEqual({
      ...qualityLead, address: place.formattedAddress, phone: place.internationalPhoneNumber, place_id: place.id,
    });
  });
  it("accepts only absent, null, or exactly empty website fields", () => {
    expect(placeToLead(place)).not.toBeNull();
    expect(placeToLead({ ...place, websiteUri: null })).not.toBeNull();
    expect(placeToLead({ ...place, websiteUri: "" })).not.toBeNull();
    for (const websiteUri of ["https://example.com", "example.com", " https://example.com ", " "]) {
      expect(placeToLead({ ...place, websiteUri })).toBeNull();
    }
  });
  it("requires rating at least 4.0", () => {
    expect(meetsQuality(qualityLead)).toBe(true);
    expect(placeToLead({ ...place, rating: 3.99 })).toBeNull();
    expect(activeLeads([{ ...qualityLead, google_rating: 3.99 }], [])).toEqual([]);
    expect(meetsQuality({ ...qualityLead, google_rating: 5 })).toBe(true);
  });
  it("requires at least 15 reviews", () => {
    expect(placeToLead({ ...place, userRatingCount: 14 })).toBeNull();
    expect(activeLeads([{ ...qualityLead, review_count: 14 }], [])).toEqual([]);
    expect(meetsQuality({ ...qualityLead, review_count: 15 })).toBe(true);
    expect(meetsQuality(qualityLead)).toBe(true);
  });
  it("requires exact ACTIVE status on displayed leads", () => {
    for (const business_status of ["CLOSED", "TEMPORARILY_CLOSED", "OPERATIONAL", "active", " ACTIVE ", ""]) {
      expect(displayableLeads([{ ...qualityLead, business_status }])).toEqual([]);
    }
    for (const businessStatus of ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY", undefined]) {
      expect(placeToLead({ ...place, businessStatus })).toBeNull();
    }
  });
  it("fails closed for missing or invalid quality and identity fields", () => {
    for (const google_rating of [null, NaN, Infinity, 5.1]) expect(meetsQuality({ ...qualityLead, google_rating })).toBe(false);
    for (const review_count of [null, NaN, Infinity, 15.5]) expect(meetsQuality({ ...qualityLead, review_count })).toBe(false);
    expect(meetsQuality({ ...qualityLead, business_status: null })).toBe(false);
    for (const invalid of [{ ...place, id: undefined }, { ...place, displayName: undefined }, { ...place, formattedAddress: "" }, { ...place, internationalPhoneNumber: "123" }, { ...place, rating: undefined }, { ...place, userRatingCount: undefined }]) expect(placeToLead(invalid)).toBeNull();
  });
  it("strictly scopes listings to the requested city and country", () => {
    expect(matchesLocation(place, { city: " austin ", country: "USA" })).toBe(true);
    expect(matchesLocation(place, { city: "Austin", country: "United States" })).toBe(true);
    expect(placeToLead(place, { city: "Dallas", country: "USA" })).toBeNull();
    expect(placeToLead(place, { city: "Austin", country: "Canada" })).toBeNull();
    expect(placeToLead({ ...place, addressComponents: undefined }, { city: "Austin", country: "USA" })).toBeNull();
  });
  it("deduplicates names and phones independently", () => {
    const sameName = { ...qualityLead, name: " QUALITY PLUMBING ", address: "20 Main St", phone: "+1 5129999999" };
    const samePhone = { ...qualityLead, name: "Other Plumbing", phone: "+1 (512) 234-5678" };
    expect(activeLeads([qualityLead, sameName, samePhone], [])).toEqual([qualityLead]);
    expect(activeLeads([sameName, samePhone], [qualityLead])).toEqual([]);
  });
  it("removes individual and bulk completed businesses", () => {
    const second = { ...qualityLead, name: "Second Plumbing", phone: "+1 5129999999", address: "20 Main St" };
    expect(activeLeads([qualityLead, second], [qualityLead])).toEqual([second]);
    expect(activeLeads([qualityLead, second], [qualityLead, second])).toEqual([]);
  });
  it("hides unqualified legacy history while preserving duplicate exclusions", () => {
    const legacy = { ...qualityLead, google_rating: null, review_count: null, business_status: null };
    expect(displayableLeads([legacy])).toEqual([]);
    expect(activeLeads([qualityLead], [legacy])).toEqual([]);
    expect(businessKey(legacy)).toBe(businessKey(qualityLead));
  });
  it("constructs the exact dynamic Maps URL with business name address and city", () => {
    expect(mapsUrl(qualityLead)).toBe("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Quality Plumbing 10 Main St, Austin, USA Austin"));
    const dallas = { ...qualityLead, name: "A & B Plumbing", address: "20 Oak St, Dallas, USA", city: "Dallas" };
    expect(new URL(mapsUrl(dallas)).searchParams.get("query")).toBe("A & B Plumbing 20 Oak St, Dallas, USA Dallas");
    expect(mapsUrl({ ...dallas, place_id: "id" })).toBe(mapsUrl(dallas));
  });
});
