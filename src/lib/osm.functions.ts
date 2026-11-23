import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildOverpassQuery, NICHES, osmElementToLead, type Lead, type OsmElement, type SearchScope } from "./leads";
import { EXPANDED_SEARCH_RADIUS_METERS, INITIAL_SEARCH_RADIUS_METERS } from "./search-pagination";

export type OsmSearchCursor = { lat: number; lon: number; radius: typeof EXPANDED_SEARCH_RADIUS_METERS };
const scopeSchema = z.object({
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  niche: z.enum(NICHES),
  cursor: z.object({
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
    radius: z.literal(EXPANDED_SEARCH_RADIUS_METERS),
  }).optional(),
});

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
const USER_AGENT = "199-Brand Local Lead Lantern/1.0 (https://local-lead-lantern.lovable.app)";

export const searchOsmLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scopeSchema.parse(input))
  .handler(async ({ data }): Promise<{
    leads: Lead[];
    scanned: number;
    radius: number;
    next: OsmSearchCursor | null;
    error?: string;
  }> => {
    const scope: SearchScope = { city: data.city, country: data.country };
    let lat: number;
    let lon: number;
    let radius: number;

    if (data.cursor) {
      lat = data.cursor.lat;
      lon = data.cursor.lon;
      radius = data.cursor.radius;
    } else {
      const params = new URLSearchParams({ format: "json", limit: "1", q: `${data.city}, ${data.country}` });
      let geocodeResponse: Response;
      try {
        geocodeResponse = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          signal: AbortSignal.timeout(8_000),
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        });
      } catch (error) {
        console.warn("Nominatim lookup failed:", error);
        return { leads: [], scanned: 0, radius: INITIAL_SEARCH_RADIUS_METERS, next: null, error: "Nominatim could not locate this city. Check the spelling and try again." };
      }
      if (!geocodeResponse.ok) {
        console.warn("Nominatim returned status:", geocodeResponse.status);
        return { leads: [], scanned: 0, radius: INITIAL_SEARCH_RADIUS_METERS, next: null, error: "Nominatim could not locate this city right now. Please try again." };
      }
      const locations = await geocodeResponse.json() as { lat?: string; lon?: string }[];
      const first = locations[0];
      lat = Number(first?.lat);
      lon = Number(first?.lon);
      if (!first || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return { leads: [], scanned: 0, radius: INITIAL_SEARCH_RADIUS_METERS, next: null, error: "Nominatim could not find that city and country." };
      }
      radius = INITIAL_SEARCH_RADIUS_METERS;
    }

    const query = buildOverpassQuery(data.niche, lat, lon, radius);
    let elements: OsmElement[] | null = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
          headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": USER_AGENT },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!response.ok) {
          console.warn("Overpass endpoint returned status:", endpoint, response.status);
          continue;
        }
        const payload = await response.json() as { elements?: OsmElement[] };
        if (!Array.isArray(payload.elements)) {
          console.warn("Overpass endpoint returned an unexpected response:", endpoint);
          continue;
        }
        elements = payload.elements;
        break;
      } catch (error) {
        console.warn("Overpass endpoint failed:", endpoint, error);
      }
    }

    if (!elements) {
      return { leads: [], scanned: 0, radius, next: null, error: "OpenStreetMap search is temporarily unavailable. Please try again." };
    }

    const leads = elements
      .map(element => osmElementToLead(element, scope))
      .filter((lead): lead is Lead => lead !== null);
    return {
      leads,
      scanned: elements.length,
      radius,
      next: data.cursor ? null : { lat, lon, radius: EXPANDED_SEARCH_RADIUS_METERS },
    };
  });