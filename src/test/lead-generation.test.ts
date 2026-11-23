import { describe, expect, it } from "vitest";
import {
  activeLeads, buildOverpassQuery, businessKey, displayableLeads, mapsUrl, meetsQuality,
  MIN_RATING, MIN_REVIEWS, NICHE_OSM_FILTERS, NICHES, osmElementToLead, type Lead, type OsmElement,
} from "@/lib/leads";

const scope = { city: "Austin", country: "USA" };
const element: OsmElement = {
  type: "node", id: 1,
  tags: {
    name: "Quality Plumbing", craft: "plumber", phone: "+1 512 234 5678",
    "addr:housenumber": "10", "addr:street": "Main St", "addr:city": "Austin", "addr:postcode": "78701",
  },
};
const osmLead: Lead = {
  name: "Quality Plumbing", phone: "+1 512 234 5678", address: "10 Main St, Austin, 78701, USA",
  website: "None", google_rating: null, review_count: null, business_status: "OSM_LISTED",
  source: "openstreetmap", city: "Austin", country: "USA",
};

describe("OpenStreetMap lead discovery", () => {
  it("offers separate home-service niches with tag mappings", () => {
    expect(NICHES).toEqual(["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician", "Solar", "House Cleaning"]);
    for (const niche of NICHES) expect(NICHE_OSM_FILTERS[niche]?.length).toBeGreaterThan(0);
  });

  it("builds a multi-tag Overpass query for nodes, ways, and relations", () => {
    const query = buildOverpassQuery("Plumbing", 30.2672, -97.7431, 25_000);
    expect(query).toContain("nwr(around:25000,30.2672,-97.7431)");
    expect(query).toContain('["craft"="plumber"]');
    expect(query).toContain('["shop"="plumber"]');
    expect(query).toContain('[name~"plumb",i]');
    expect(query).toContain("out center tags;");
    expect(() => buildOverpassQuery("Solar", 100, 0, 25_000)).toThrow("coordinates");
  });

  it("converts a real named OSM record with phone and street address", () => {
    expect(osmElementToLead(element, scope)).toEqual(osmLead);
  });

  it("rejects records without a name and every populated website field", () => {
    expect(osmElementToLead({ ...element, tags: { craft: "plumber" } }, scope)).toBeNull();
    for (const field of ["website", "contact:website", "url"]) {
      expect(osmElementToLead({ ...element, tags: { ...element.tags, [field]: "example.com" } }, scope)).toBeNull();
    }
    expect(osmElementToLead({ ...element, tags: { ...element.tags, website: " " } }, scope)).toEqual(osmLead);
  });

  it("uses the available phone fields and a real location fallback when address tags are absent", () => {
    const noStreet: OsmElement = { tags: { name: "Local Contractor", "contact:phone": "+1 555 012 3456" } };
    const converted = osmElementToLead(noStreet, scope);
    expect(converted?.phone).toBe("+1 555 012 3456");
    expect(converted?.address).toBe("Austin, USA");
    expect(osmElementToLead({ tags: { name: "No Phone" } }, scope)?.phone).toBe("Not listed");
    expect(osmElementToLead({ tags: { name: "Mobile Contact", "contact:mobile": "+1 555 111 2222" } }, scope)?.phone).toBe("+1 555 111 2222");
  });

  it("allows missing OSM ratings and reviews but enforces any numeric values provided", () => {
    expect(MIN_RATING).toBe(4.0);
    expect(MIN_REVIEWS).toBe(15);
    expect(osmElementToLead(element, scope)).toEqual(osmLead);
    expect(osmElementToLead({ ...element, tags: { ...element.tags, rating: "3.99" } }, scope)).toBeNull();
    expect(osmElementToLead({ ...element, tags: { ...element.tags, rating: "4.0", user_ratings_total: "14" } }, scope)).toBeNull();
    expect(osmElementToLead({ ...element, tags: { ...element.tags, rating: "4.0", user_ratings_total: "15" } }, scope)?.google_rating).toBe(4);
    expect(meetsQuality(osmLead)).toBe(true);
    expect(meetsQuality({ ...osmLead, google_rating: 3.9 })).toBe(false);
    expect(meetsQuality({ ...osmLead, review_count: 14 })).toBe(false);
  });

  it("keeps legacy unqualified history hidden while retaining strict Google-history checks", () => {
    const legacy = { ...osmLead, google_rating: null, review_count: null, business_status: null, source: "google" as const };
    expect(displayableLeads([osmLead])).toEqual([osmLead]);
    expect(displayableLeads([legacy])).toEqual([]);
    expect(meetsQuality({ ...osmLead, source: "google", business_status: "ACTIVE" })).toBe(false);
  });

  it("deduplicates by normalized name and address plus listed phone, not name alone", () => {
    const sameBusiness = { ...osmLead, name: " QUALITY PLUMBING ", phone: "+1 (512) 234-5678" };
    const samePhone = { ...osmLead, name: "Different Contractor", address: "20 Oak St, Austin, USA" };
    const differentLocation = { ...osmLead, address: "20 Main St, Austin, USA", phone: "+1 512 999 9999" };
    expect(activeLeads([osmLead, sameBusiness, samePhone, differentLocation], [])).toEqual([osmLead, differentLocation]);
    expect(activeLeads([osmLead], [sameBusiness])).toEqual([]);
    expect(businessKey(osmLead)).toBe(businessKey(sameBusiness));
  });

  it("excludes contacted businesses even when their old quality data is missing", () => {
    const legacy = { ...osmLead, google_rating: null, review_count: null, business_status: null, source: "google" as const };
    expect(displayableLeads([legacy])).toEqual([]);
    expect(activeLeads([osmLead], [legacy])).toEqual([]);
  });

  it("builds Google Maps search URLs with name, address, city, and country", () => {
    expect(mapsUrl(osmLead)).toBe("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Quality Plumbing 10 Main St, Austin, 78701, USA Austin USA"));
    expect(new URL(mapsUrl({ ...osmLead, name: "A & B Plumbing" })).searchParams.get("query")).toBe("A & B Plumbing 10 Main St, Austin, 78701, USA Austin USA");
  });
});