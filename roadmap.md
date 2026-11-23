# Contacted leads
- [x] Cap each search at 30 raw listings with a 10s request timeout and a client-side failsafe so Generate Leads never hangs; keep full matching yield within that cap.
- [x] Replace broken mock imports with real authenticated Google Maps search; enforce location scope, quality, unique names/phones, and dynamic Maps URLs.
- [x] Run focused regression tests and verify non-Maps page interactions.
- [ ] Verify real Google Maps searches and listing links on an authorized deployed origin — agent sandbox does not support live Maps validation.
- [x] Enforce rating 4.0+, reviews 20+, and ACTIVE for generated and displayed leads; preserve legacy contacted exclusions.
- [x] Test quality thresholds and missing data.
- [x] Save contacted businesses privately in Cloud.
- [x] Add row completion, bulk completion, and history tab.
- [x] Exclude contacted and duplicate businesses during generation.
- [x] Test completion rules, persistence functions, regeneration, and signed-out controls.
- [ ] Verify signed-in saving and reload through the live page with real listings — blocked on live Maps validation on an authorized deployed origin; persistence regression tests pass.
- [x] Add a Maps Link column opening a Google Maps search for each lead.
- [x] Make Maps Link open its own browser window, including inside an embedded preview frame.

## OpenStreetMap discovery overhaul
- [ ] Replace Google Places with Nominatim geocoding and Overpass business-tag queries; never fabricate records.
- [ ] Add OSM conversion, address formatting, no-website validation, optional rating/review checks, and deduplication tests.
- [ ] Add Solar and House Cleaning niches while preserving the separate Electrician category.
- [ ] Expand Load More from 25 km to 45 km and append unique results with accurate counts and actual-result status.
- [ ] Preserve CSV export, Maps links, and contacted history; verify the end-to-end preview flow.