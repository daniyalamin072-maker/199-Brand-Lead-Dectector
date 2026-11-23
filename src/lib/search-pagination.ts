export const INITIAL_SEARCH_RADIUS_METERS = 25_000;
export const EXPANDED_SEARCH_RADIUS_METERS = 45_000;

/** Expand once on Load More; Overpass returns all matching elements within a radius. */
export function nextSearchRadius(currentRadius: number): number | null {
  return currentRadius < EXPANDED_SEARCH_RADIUS_METERS ? EXPANDED_SEARCH_RADIUS_METERS : null;
}