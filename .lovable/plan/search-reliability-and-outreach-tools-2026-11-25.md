# Search reliability and outreach tools

## What will change
- Improve OpenStreetMap reliability by trying the three requested Overpass mirrors in order, with a short per-mirror timeout, identifying request headers, useful rate-limit/timeout messages, and a retry path that does not discard existing results.
- Keep listings real and no-website only, preserve name/address and phone deduplication, Load More appending, Google Maps links, CSV export, and contacted-lead history.
- Add built-in analytics events for completed lead searches, result counts, radius expansions, and leads marked as done. Events will contain aggregate counts and niche/radius only, not city names or listing details.
- Add a lead-row action to select a listing, enter a service offer, and request a personalized outreach draft through the authenticated AI Gateway. The draft remains editable/copyable and is never sent automatically.
- Add named search presets for city, country, niche, and radius. Use browser-only storage unless the pending storage-choice question is answered with Cloud sync.

## Technical details
- Keep public-service requests in the authenticated TanStack server function and preserve endpoint failover without parallel bursts. Represent a 25 km or 45 km starting radius in the search request so presets replay accurately.
- Keep AI prompts and SDK calls in a separate authenticated server function; use the workspace-eligible Responses model, validate input length, return only plain text, and preserve user input on errors.
- Emit `project.*` events directly in the existing successful search and contacted-lead handlers, register their schemas, and run the analytics schema check.
- Keep preset parsing and validation in a pure helper; access local storage only in browser effects or event handlers.
- Record the new outreach and preset storage boundaries in `AGENTS.md`; add focused tests for new quality-affecting or persistence rules.

## Verification
- Run focused lead, search-pagination, preset, outreach, and contacted-history tests.
- Verify search retry/append states, preset save-and-reuse, AI draft flow, and event calls in the preview; inspect build diagnostics before completion.
