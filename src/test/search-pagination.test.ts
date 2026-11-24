import { describe, expect, it } from "vitest";
import { EXPANDED_SEARCH_RADIUS_METERS, INITIAL_SEARCH_RADIUS_METERS, nextSearchRadius } from "@/lib/search-pagination";
import { activeLeads, type Lead } from "@/lib/leads";

describe("OpenStreetMap radius expansion and full yield", () => {
  it("searches 25 km first and expands once to 45 km on Load More", () => {
    expect(INITIAL_SEARCH_RADIUS_METERS).toBe(25_000);
    expect(EXPANDED_SEARCH_RADIUS_METERS).toBe(45_000);
    expect(nextSearchRadius(INITIAL_SEARCH_RADIUS_METERS)).toBe(45_000);
    expect(nextSearchRadius(EXPANDED_SEARCH_RADIUS_METERS)).toBeNull();
  });

  it("keeps every unique qualified real listing without an app-imposed result cutoff", () => {
    const candidates: Lead[] = Array.from({ length: 245 }, (_, index) => ({
      name: `Business ${index}`, phone: `+1512${String(index).padStart(7, "0")}`,
      address: `${index} Main St, Austin, USA`, website: "None",
      google_rating: null, review_count: null, business_status: "OSM_LISTED", source: "openstreetmap",
    }));
    const first = candidates[0];
    if (!first) throw new Error("Expected candidate");
    expect(activeLeads([...candidates, { ...first, address: "Changed address" }, { ...first, name: "Changed name" }], [])).toEqual(candidates);
    expect(activeLeads(candidates, [])).toHaveLength(245);
  });
});