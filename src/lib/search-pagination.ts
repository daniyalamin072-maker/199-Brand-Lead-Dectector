/** Hard cap on raw listings scanned per search so requests finish in seconds. */
export const RAW_LISTING_CAP = 100;
export const reachedRawCap = (scanned: number) => scanned >= RAW_LISTING_CAP;

/** Provider-driven pagination with no app-imposed page or result cutoff. */
export function advancePageToken(value: unknown, usedTokens: Set<string>): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid search page token.");
  if (usedTokens.has(value)) throw new Error("Google Maps repeated a page token; the search is incomplete.");
  usedTokens.add(value);
  return value;
}