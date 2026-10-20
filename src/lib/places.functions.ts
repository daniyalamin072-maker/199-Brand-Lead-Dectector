import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activeLeads, NICHES, NICHE_QUERIES, placeToLead, type Lead, type Place } from "./leads";
import { advancePageToken, reachedRawCap } from "./search-pagination";

const REQUEST_TIMEOUT_MS = 10_000;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const FIELDS = ["id", "displayName", "formattedAddress", "addressComponents", "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "rating", "userRatingCount", "businessStatus"];

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
      const usedTokens = new Set<string>();
      do {
        let response: Response;
        try {
          response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
            method: "POST", headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            body: JSON.stringify({ textQuery: `${phrase} in ${data.city}, ${data.country}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
          });
        } catch {
          return { leads: activeLeads(leads, []), scanned, error: leads.length ? "Google Maps took too long; showing matching listings received so far." : "Google Maps took too long to respond. Please try again." };
        }
        if (!response.ok) {
           const errorBody = await response.text();
           console.error(`Places search failed [${response.status}]: ${errorBody}`);
           if (response.status === 403) {
             let reason = "";
             try {
               const failure = JSON.parse(errorBody) as { error?: { details?: { reason?: string }[] } };
               reason = failure.error?.details?.find(d => d.reason)?.reason ?? "";
             } catch { /* Non-JSON provider response. */ }
             const error = reason === "API_KEY_HTTP_REFERRER_BLOCKED"
               ? 'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key application restrictions to "None" or "IP addresses".'
               : reason === "API_KEY_SERVICE_BLOCKED"
                 ? 'Google Maps server key does not allow Places API (New). Enable it and add it to the server key allowed APIs in Google Cloud Console.'
                 : 'Google Maps request was denied (403). Check the server key restrictions in Google Cloud Console.';
             return { leads: activeLeads(leads, []), scanned, error };
           }
           return { leads: activeLeads(leads, []), scanned, error: leads.length ? "Google Maps stopped responding; showing matching listings received so far." : `Google Maps search failed (${response.status}). Please try again.` };
        }
        const body = await response.json() as { places?: Place[]; nextPageToken?: string };
        for (const place of body.places ?? []) {
          if (!place.id || seen.has(place.id)) continue;
          seen.add(place.id); scanned++;
           const lead = placeToLead(place, data);
          if (lead) leads.push(lead);
        }
        try {
          pageToken = advancePageToken(body.nextPageToken, usedTokens);
        } catch (error) {
          return { leads: activeLeads(leads, []), scanned, error: error instanceof Error ? error.message : "Google Maps pagination failed; showing partial results." };
        }
      } while (pageToken && !reachedRawCap(scanned));
      if (reachedRawCap(scanned)) break;
    }
    return { leads: activeLeads(leads, []), scanned };
  });
