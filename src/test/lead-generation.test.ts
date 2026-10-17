import { describe, expect, it } from "vitest";

import { generate, NICHES } from "@/routes/index";

// The dashboard must only ever surface businesses that have no website at all,
// one click has to return a deep list of them, and the niche picker has to cover
// every home-service category the agency sells.
describe("Lead generation", () => {
  it("returns at least 120 businesses, all with no website", () => {
    const leads = generate("Austin", "USA", "Plumbing");

    expect(leads.length).toBeGreaterThanOrEqual(120);
    expect(leads.every((l) => l.website === "None")).toBe(true);
    expect(leads.filter((l) => l.website === "None").length).toBe(leads.length);
  });

  it("offers every home-service niche and names businesses for each", () => {
    expect(NICHES).toEqual(["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrician"]);

    for (const niche of NICHES) {
      const leads = generate("Austin", "USA", niche);
      expect(leads.length).toBeGreaterThanOrEqual(120);
      expect(leads.every((l) => l.name.trim().length > 0)).toBe(true);
    }
  });
});
