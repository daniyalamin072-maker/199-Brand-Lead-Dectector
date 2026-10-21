import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activeLeads, NICHES, NICHE_QUERIES, placeToLead, type Lead, type Place } from "./leads";

const REQUEST_TIMEOUT_MS = 8_000;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const FIELDS = ["id", "displayName", "formattedAddress", "addressComponents", "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "rating", "userRatingCount", "businessStatus"];

export type PageCursor = { phrase: number; pageToken?: string | undefined };

/** Fetches ONE Google Maps results page; the browser loops batches and shows progress. */
export const searchLeadsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    city: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(80),
    niche: z.enum(NICHES),
    phrase: z.number().int().min(0).max(20),
    pageToken: z.string().max(2000).optional(),
  }).parse(input))
  .handler(async ({ data }): Promise<{ leads: Lead[]; scanned: number; next: PageCursor | null; error?: string }> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return { leads: [], scanned: 0, next: null, error: "Google Maps is not connected." };
    const phrases = NICHE_QUERIES[data.niche] ?? [];
    const phrase = phrases[data.phrase];
    if (!phrase) return { leads: [], scanned: 0, next: null };
    const nextPhrase = (): PageCursor | null => data.phrase + 1 < phrases.length ? { phrase: data.phrase + 1 } : null;
    let response: Response;
    try {
      response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": [...FIELDS.map(f => `places.${f}`), "nextPageToken"].join(","),
        },
        body: JSON.stringify({ textQuery: `${phrase} in ${data.city}, ${data.country}`, pageSize: 20, ...(data.pageToken ? { pageToken: data.pageToken } : {}) }),
      });
    } catch (err) {
      console.error("Places batch request failed:", err);
      return { leads: [], scanned: 0, next: nextPhrase(), error: "timeout" };
    }
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Places search failed [${response.status}]: ${errorBody}`);
      if (response.status === 403) {
        let reason = "";
        try { reason = (JSON.parse(errorBody) as { error?: { details?: { reason?: string }[] } }).error?.details?.find(d => d.reason)?.reason ?? ""; } catch { /* non-JSON */ }
        const error = reason === "API_KEY_HTTP_REFERRER_BLOCKED"
          ? 'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key application restrictions to "None" or "IP addresses".'
          : reason === "API_KEY_SERVICE_BLOCKED"
            ? "Google Maps server key does not allow Places API (New). Enable it in Google Cloud Console."
            : "Google Maps request was denied (403). Check the server key restrictions in Google Cloud Console.";
        return { leads: [], scanned: 0, next: null, error };
      }
      return { leads: [], scanned: 0, next: null, error: `Google Maps search failed (${response.status}). Please try again.` };
    }
    const body = await response.json() as { places?: Place[]; nextPageToken?: string };
    const leads: Lead[] = [];
    let scanned = 0;
    for (const place of body.places ?? []) {
      if (!place.id) continue;
      scanned++;
      const lead = placeToLead(place, data);
      if (lead) leads.push(lead);
    }
    const token = typeof body.nextPageToken === "string" && body.nextPageToken.trim() && body.nextPageToken !== data.pageToken ? body.nextPageToken : undefined;
    return { leads: activeLeads(leads, []), scanned, next: token ? { phrase: data.phrase, pageToken: token } : nextPhrase() };
  });
