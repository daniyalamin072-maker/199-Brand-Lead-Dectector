import { describe, expect, it } from "vitest";

import { activeLeads, businessKey, generate, NICHES } from "@/lib/leads";

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

  it("never regenerates a contacted business and still fills 120+ leads", () => {
    const contacted = generate("Austin", "USA", "Plumbing");
    const next = generate("Austin", "USA", "Plumbing", contacted);
    const keys = new Set(contacted.map(businessKey));
    expect(next.length).toBeGreaterThanOrEqual(120);
    expect(next.every(lead => !keys.has(businessKey(lead)))).toBe(true);
  });

  it("removes one completed lead from the active list", () => {
    const leads = generate("Austin", "USA", "Roofing");
    const first = leads[0];
    if (!first) throw new Error("Expected a lead");
    expect(activeLeads(leads, [first])).toHaveLength(leads.length - 1);
  });

  it("removes all completed leads from the active list", () => {
    const leads = generate("Austin", "USA", "Electrician");
    expect(activeLeads(leads, leads)).toEqual([]);
  });

  it("deduplicates normalized business addresses and phone numbers", () => {
    const lead = { name: "Apex Plumbing", address: "10 Main St, Austin, USA", phone: "+1 234 567 8900", website: "None" as const };
    const renamed = { ...lead, name: "Changed Name", phone: "+1 (234) 567-8900" };
    const reformatted = { ...lead, name: " APEX PLUMBING ", address: "10 MAIN ST., Austin, USA", phone: "555" };
    expect(activeLeads([lead, renamed, reformatted], [])).toEqual([lead]);
    expect(activeLeads([renamed, reformatted], [lead])).toEqual([]);
  });

  it("keeps mock business identities stable across searches", () => {
    const first = generate("Austin", "USA", "HVAC").slice(0, 120);
    const second = generate(" austin ", "usa", "HVAC").slice(0, 120);
    expect(second.map(businessKey)).toEqual(first.map(businessKey));
    expect(new Set(first.map(businessKey)).size).toBe(120);
  });
});
