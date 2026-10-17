import { describe, expect, it } from "vitest";

import { generate } from "@/routes/index";

// The dashboard must only ever surface businesses that have no website at all.
describe("Lead generation", () => {
  it("returns only businesses with no website", () => {
    const leads = generate("Austin", "USA", "Plumbing");

    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((l) => l.website === "None")).toBe(true);
    expect(leads.filter((l) => l.website === "None").length).toBe(leads.length);
  });
});
