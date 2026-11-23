# OpenStreetMap lead discovery overhaul

## What will change
- Replace Google Places search with real OpenStreetMap discovery: geocode the selected city and country, then query relevant business tags within 25 km.
- Add OSM tag mappings for Plumbing, HVAC, Landscaping, Roofing, Electrician, Solar, and House Cleaning. Return only named listings without website tags; never create sample businesses.
- Convert records through shared validation and deduplication. Keep records when OSM has no rating or review data, show `N/A (OSM)`, and reject any provided rating below 4.0 or review count below 15.
- Make Load More expand the search to 45 km and append only unique businesses. Show actual result counts and status, while preserving CSV export, Maps links, and contacted actions.
- Keep the existing private, account-scoped history unless browser-only storage is selected.

## Technical details
- Use a TanStack server function for Nominatim and Overpass requests, with an identifying User-Agent and automatic Overpass endpoint failover.
- Add pure OSM conversion, query-building, address, and identity helpers with focused regression tests.
- Build Google Maps search links from business name, address, city, and country; retain safe new-tab attributes.
- OSM does not consistently provide ratings, review counts, or operating status. The app will not invent values or claim directory-wide completeness.

## Verification
- Run lead, history, and pagination tests; inspect build diagnostics; verify search, Load More, counts, CSV, and Maps links in the preview.