# Contacted leads
- [x] Cap each search at 30 raw listings with a 10s request timeout and a client-side failsafe so Generate Leads never hangs; keep full matching yield within that cap.
- [x] Replace broken mock imports with real authenticated Google Maps search; enforce location scope, quality, unique names/phones, and dynamic Maps URLs.
- [x] Run focused regression tests and verify non-Maps page interactions.
- [x] Replace the Google search source with real OpenStreetMap listings; track live-provider verification below.
- [x] Enforce rating 4.0+, reviews 20+, and ACTIVE for generated and displayed leads; preserve legacy contacted exclusions.
- [x] Test quality thresholds and missing data.
- [x] Save contacted businesses privately in Cloud.
- [x] Add row completion, bulk completion, and history tab.
- [x] Exclude contacted and duplicate businesses during generation.
- [x] Test completion rules, persistence functions, regeneration, and signed-out controls.
- [ ] Verify signed-in OpenStreetMap search and Cloud history in preview — awaiting an approved sign-in session; the test-session request was declined and public Overpass endpoints did not answer in this sandbox.
- [x] Add a Maps Link column opening a Google Maps search for each lead.
- [x] Make Maps Link open its own browser window, including inside an embedded preview frame.

## OpenStreetMap discovery overhaul
- [x] Replace Google Places with Nominatim geocoding and Overpass business-tag queries; never fabricate records.
- [x] Add OSM conversion, address formatting, no-website validation, optional rating/review checks, and deduplication tests.
- [x] Add Solar and House Cleaning niches while preserving the separate Electrician category.
- [x] Expand Load More from 25 km to 45 km and append unique results with accurate counts and actual-result status.
- [x] Preserve CSV export, Maps links, and contacted history; verify the public dashboard and sign-in gate.
- [ ] Verify signed-in live search and history once preview sign-in is approved and Overpass responds; the test-session request was declined and the endpoints returned 406/timeout here.