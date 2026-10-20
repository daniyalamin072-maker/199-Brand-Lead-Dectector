import { describe, expect, it } from "vitest";
import { advancePageToken, RAW_LISTING_CAP, reachedRawCap } from "@/lib/search-pagination";
import { activeLeads, type Lead } from "@/lib/leads";

describe("Full search yield", () => {
  it("continues past three pages until the provider has no further token", () => {
    const usedTokens = new Set<string>();
    for (let page = 1; page <= 12; page++) {
      expect(advancePageToken(`page-${page}`, usedTokens)).toBe(`page-${page}`);
    }
    expect(usedTokens.size).toBe(12);
    expect(advancePageToken(undefined, usedTokens)).toBeUndefined();
    expect(advancePageToken(null, usedTokens)).toBeUndefined();
    expect(advancePageToken("", usedTokens)).toBeUndefined();
  });
  it("caps raw listings at 100 per search so scans stay deep but bounded", () => {
    expect(RAW_LISTING_CAP).toBe(100);
    expect(reachedRawCap(0)).toBe(false);
    expect(reachedRawCap(99)).toBe(false);
    expect(reachedRawCap(100)).toBe(true);
    expect(reachedRawCap(150)).toBe(true);
  });
  it("stops a repeated token instead of making endless paid requests", () => {
    const usedTokens = new Set<string>();
    advancePageToken("page-2", usedTokens);
    expect(() => advancePageToken("page-2", usedTokens)).toThrow("search is incomplete");
    expect(() => advancePageToken(123, usedTokens)).toThrow("Invalid search page token");
  });
  it("preserves the entire qualifying unique yield without a 60 or 100 result cap", () => {
    const candidates: Lead[] = Array.from({ length: 245 }, (_, i) => ({
      name: `Business ${i}`, phone: `+1512${String(i).padStart(7, "0")}`,
      address: `${i} Main St, Austin, USA`, website: "None",
      google_rating: 4.0, review_count: 20, business_status: "ACTIVE",
    }));
    const first = candidates[0];
    if (!first) throw new Error("Expected candidate");
    expect(activeLeads([...candidates, { ...first, address: "Changed address" }, { ...first, name: "Changed name" }, { ...first, name: "Low rating", phone: "+19999999999", google_rating: 3.99 }], [])).toEqual(candidates);
    expect(activeLeads(candidates, []).length).toBe(245);
  });
});