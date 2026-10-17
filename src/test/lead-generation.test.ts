import { describe, expect, it } from "vitest";

import { generate } from "@/routes/index";

// The dashboard must only ever surface businesses that have no website at all,
// and one click has to return a deep list of them.
describe("Lead generation", () => {
  it("returns at least 120 businesses, all with no website", () => {
    const leads = generate("Austin", "USA", "Plumbing");

    expect(leads.length).toBeGreaterThanOrEqual(120);
    expect(leads.every((l) => l.website === "None")).toBe(true);
    expect(leads.filter((l) => l.website === "None").length).toBe(leads.length);
  });
});
