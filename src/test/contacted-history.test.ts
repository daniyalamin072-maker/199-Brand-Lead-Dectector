import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ range: vi.fn(), upsert: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({
    select: () => ({ eq: mocks.eq }),
    upsert: mocks.upsert,
  }) },
}));
import { readHistory, saveContacted } from "@/lib/contacted-history";
import { businessKey } from "@/lib/leads";
const lead = { name: "Apex Plumbing", phone: "+1 2345678900", address: "10 Main St, Austin, USA", website: "None" as const, google_rating: 4.0, review_count: 20, business_status: "ACTIVE" };
describe("Contacted history persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const ordered = { order: () => ordered, range: mocks.range };
    mocks.eq.mockReturnValue(ordered);
  });
  it("reads every history page so older contacted leads cannot return", async () => {
    mocks.range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ ...lead, business_key: `${i}`, contacted_at: "2026-10-17" })), error: null });
    mocks.range.mockResolvedValueOnce({ data: [{ ...lead, business_key: "older", contacted_at: "2026-10-16" }], error: null });
    const result = await readHistory("owner");
    expect(result).toHaveLength(1001);
    expect(result.at(-1)?.business_key).toBe("older");
    expect(mocks.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("identifies OSM-listed history without inventing rating or review data", async () => {
    mocks.range.mockResolvedValueOnce({ data: [{ ...lead, google_rating: null, review_count: null, business_status: "OSM_LISTED", business_key: "osm", contacted_at: "2026-10-17" }], error: null });
    const result = await readHistory("owner");
    expect(result[0]?.source).toBe("openstreetmap");
    expect(result[0]?.google_rating).toBeNull();
    expect(result[0]?.review_count).toBeNull();
  });
  it("stores completed leads once with their owner and stable business identity", async () => {
    mocks.upsert.mockResolvedValue({ error: null });
    await saveContacted("owner", [{ ...lead, city: "Austin" }, lead]);
    expect(mocks.upsert).toHaveBeenCalledWith([{ ...lead, business_key: businessKey(lead), user_id: "owner" }], { onConflict: "user_id,business_key", ignoreDuplicates: true });
  });
  it("saves a real OSM lead even when OSM has no rating or review count", async () => {
    mocks.upsert.mockResolvedValue({ error: null });
    const osmLead = { ...lead, google_rating: null, review_count: null, business_status: "OSM_LISTED", source: "openstreetmap" as const };
    await saveContacted("owner", [osmLead]);
    expect(mocks.upsert).toHaveBeenCalledWith([{
      name: osmLead.name, phone: osmLead.phone, address: osmLead.address, website: "None",
      google_rating: null, review_count: null, business_status: "OSM_LISTED",
      business_key: businessKey(osmLead), user_id: "owner",
    }], { onConflict: "user_id,business_key", ignoreDuplicates: true });
  });
  it("rejects a failed history check instead of silently returning no exclusions", async () => {
    mocks.range.mockResolvedValue({ data: null, error: new Error("History unavailable") });
    await expect(readHistory("owner")).rejects.toThrow("History unavailable");
  });
  it("reports unsuccessful saves so active leads are not falsely removed", async () => {
    mocks.upsert.mockResolvedValue({ error: new Error("Save unavailable") });
    await expect(saveContacted("owner", [lead])).rejects.toThrow("Save unavailable");
  });
  it("does not save a lead that fails any quality condition", async () => {
    for (const invalid of [{ ...lead, google_rating: 3.9 }, { ...lead, review_count: 4 }, { ...lead, business_status: "CLOSED" }]) {
      await expect(saveContacted("owner", [invalid])).rejects.toThrow("quality requirements");
    }
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});