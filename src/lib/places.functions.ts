import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NICHES, NICHE_QUERIES, placeToLead, type Lead, type Place } from "./leads";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const FIELDS = ["id", "displayName", "formattedAddress", "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "rating", "userRatingCount", "businessStatus"];
const MAX_PAGES = 3; // Google returns at most 60 results per query

export const searchRealLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    city: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(80),
    niche: z.enum(NICHES),
  }).parse(input))
  .handler(async ({ data }): Promise<{ leads: Lead[]; scanned: number; error?: string }> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return { leads: [], scanned: 0, error: "Google Maps is not connected." };
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": [...FIELDS.map(f => `places.${f}`), "nextPageToken"].join(","),
    };
    const seen = new Set<string>();
    const leads: Lead[] = [];
    let scanned = 0;
    for (const phrase of NICHE_QUERIES[data.niche] ?? []) {
      let pageToken: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
          method: "POST", headers,
          body: JSON.stringify({ textQuery: `${phrase} in ${data.city}, ${data.country}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
        });
        if (!response.ok) {
          console.error(`Places search failed [${response.status}]: ${await response.text()}`);
          return { leads, scanned, error: leads.length ? "Google Maps stopped responding; showing what was verified so far." : `Google Maps search failed (${response.status}). Please try again.` };
        }
        const body = await response.json() as { places?: Place[]; nextPageToken?: string };
        for (const place of body.places ?? []) {
          if (!place.id || seen.has(place.id)) continue;
          seen.add(place.id); scanned++;
          const lead = placeToLead(place);
          if (lead) leads.push(lead);
        }
        pageToken = body.nextPageToken;
        if (!pageToken) break;
      }
    }
    return { leads, scanned };
  });
