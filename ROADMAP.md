# Vagamundo — Feature Roadmap

## Shipped

### Mobile UX Overhaul (2026-06-20) `7c20a96`
- Autocomplete for destination + origin (100+ cities, keyboard nav)
- Departure city field → passed to AI prompt and booking links
- `localStorage` persistence: dates, travelers, interests, origin
- Dark mode contrast fix: `text-white` → `text-background` on `bg-foreground` buttons
- Budget input: select-all on focus, "activities only" checkbox
- Date auto-advance: departure field → return field on pick
- 5 trip cards instead of 3 (tiers: ultra-budget / budget / balanced / premium / luxury)
- Results crash fix: `useRef` guard against React Strict Mode double-fetch
- "Nochmal versuchen" reloads the current search instead of resetting the wizard
- 10th interest category (Nightlife & Events), upgraded icons
- Two-column results layout: `flex-col` on mobile, `lg:flex-row` on desktop

### Screenshot Upload — Destination Scanner (2026-06-20) `853ddd2`
- Upload any travel photo → Claude Vision identifies destination, country, region, confidence
- Returns matching interests (culture, nature, food, etc.) + a short tagline
- Pre-fills the destination field and interest checkboxes automatically
- `DestinationScanner` component lives in the homepage chips bar and plan wizard Step 1
- `/api/identify-destination`: multipart form → base64 → `claude-sonnet-4-6` vision, strips code fences
- Max 4 MB, supports JPEG / PNG / WebP / GIF

### Adventure Mode (2026-06-20) `b4699f3`
Toggle on the homepage chips bar that shifts the entire experience to off-the-beaten-path travel.

- **Homepage**: ⚡ amber toggle pill + 12 adventure destination chips swap in (Patagonia, Kyrgyzstan, Faroe Islands, Namibia, Oman, Mongolia, Georgia, Rwanda, Svalbard, Bhutan, Tajikistan, Madagascar)
- Search bar placeholder and CTA button change when active
- **Plan page**: reads `adventure=1` URL param, auto-pre-selects adventure + nature interests, amber banner across all steps
- **API**: adventure system prompt — avoid tourist traps, prioritize local guesthouses / homestays / mountain huts, physical experiences, explorer tone
- **Card tiers in adventure mode**: Backpacker / Active Explorer / Balanced Active / Premium Expedition / Luxury Adventure Lodge
- **Results**: badge shows "⚡ Adventure Mode · 5 off-beat options"

### Safety & Weather Panel (2026-06-20) `50bc949`
Non-blocking panel between the AI plan and booking links on every results page.

- **Auswärtiges Amt**: fetches German Foreign Office open data JSON → 4 warning levels: none ✅ / notice ℹ️ / partial ⚠️ / full warning 🔴
- **Open-Meteo geocoding**: maps destination string → lat/lon + country code (free, no key)
- **Open-Meteo forecast**: 16-day daily forecast filtered to travel dates; falls back to current 7-day when dates are out of range
- **Extreme-weather alerts**: heat ≥ 38°C, cold ≤ −15°C, heavy rain ≥ 50 mm/day, thunderstorm
- Loads async with skeleton (never blocks the main result)
- Hidden for multi-city trips

### Season-based Discovery (2026-06-20) `09d802c`
New `/discover` page — inverse flow: start with when + interests, not where.

- **Form**: month pills (Jan–Dec, defaults to current month), interest chips (same 10 as /plan), 5 budget tiers with price ranges (ultra-budget < €600 → luxury > €5k)
- **API** `/api/discover`: single Claude tool-call (`suggest_destinations`), forced structured output — returns 5 cards with destination, country, emoji, tagline, whyNow, climate, highlights, priceFrom/priceTo, gradient. No Tavily needed — Claude's seasonal knowledge is sufficient.
- **Cards**: gradient header (emoji + name + country + price range), why-now text, climate summary, expandable highlights, "Plan this trip →" → `/plan?destination=X`
- **Entry points**: "Discover" in desktop nav + mobile menu; "🌍 Where to go?" chip button on homepage alongside Scanner and Adventure toggle

### Family Mode (2026-06-21) `06ca150`
Automatic — activates when "Familie" interest is selected in Step 4. No separate toggle.

- **Plan wizard**: teal `🎡 Family Mode` banner appears when Familie is selected; summary step shows confirmation badge
- **AI system prompt addition**: prioritize kid-friendly activities (theme parks, beaches, gentle walks, interactive museums), avoid strenuous hikes / extreme sports, recommend family rooms + resorts with pools / kids clubs, include child discount notes (under-12 free, family passes), safe walkable neighbourhoods, child-paced itinerary
- **Card tiers**: budget self-catering apartment → affordable family hotel (pool, kids menu) → family resort (kids club) → premium villa → luxury all-inclusive
- **Results badge**: "🎡 Family Mode · 5 kid-friendly options"

### Login / User Profile (2026-06-21) `40590e5`
Supabase magic link auth — no password required.

- `@supabase/ssr` installed; browser client (`createBrowserClient`) + server client (`createServerClient` with cookies)
- **Middleware** at `src/middleware.ts`: refreshes session on every request so auth tokens never silently expire
- **`/login` page**: email input → magic link sent; confirmation screen with "use different email" escape
- **`/auth/callback`** route: PKCE code exchange → redirects to `/saved` on success
- **`UserNav` component**: shows "Sign in" link when logged out; email + "Sign out" when logged in — wired into both `SiteNav` (all inner pages) and the homepage custom nav
- **New trips tagged with `user_id`** when logged in (server-side, via cookie session)

> **Setup required:**
> 1. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` + Vercel (get from Supabase dashboard → Project Settings → API → "anon public" key)
> 2. Run in Supabase SQL editor: `ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);`

### Real Flight Prices — Amadeus (2026-06-21) `65fb834`
Replaces Tavily web-scraping for flights with live Amadeus Flight Offers Search API.

- **`src/lib/amadeus.ts`**: OAuth2 token fetch with in-memory cache; 100+ city → IATA airport code mapping; partial-match handles "Tokyo, Japan" / "Berlin, Germany" style names; ISO 8601 duration parser ("PT10H30M" → "10h 30m")
- **Sandbox** default (`test.api.amadeus.com`); set `AMADEUS_PRODUCTION=1` for live data
- **`executeTool`** for `search_flights` and `executeMultiCityTool` for `search_flight_leg`: Amadeus first, Tavily fallback (transparent if keys absent or IATA unknown)
- **SSE event** `{ type: "flights" }` forwarded when real data returns
- **Results page**: sky-blue pill `"✈️ BER → NRT · €450–€650 per person  live via Amadeus"`

> **Setup:** `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET` in Vercel (free sandbox: developers.amadeus.com)

### Real Hotel Prices — Amadeus (2026-06-21) `1ea3e1a`
Amadeus Hotel Search API — 2-step: hotel IDs by city → live offers with prices.

- **`HOTEL_CITY` map**: separate city-code overrides for cities where IATA city code ≠ airport code (LON/PAR/NYC/TYO/ROM/MIL/OSA/SEL/BJS/SHA…); falls back to airport code for European cities
- **`searchAmadeusHotels()`**: `/v1/reference-data/locations/hotels/by-city` (5km radius, rating filter) → `/v3/shopping/hotel-offers` (check-in/out, adults, EUR, best-rate-only)
- Star-rating filter by style: `luxury` → 4-5★, `budget` → 2-3★, default → 3-5★
- Returns price per night (= total ÷ nights), priceRange, up to 8 hotels
- **SSE event** `{ type: "hotels" }`; emerald pill `"🏨 €150–€280/night · 7 nights  live"` in results

### Real Activities — Amadeus Tours & Activities (2026-06-21) `3326ee5`
Amadeus Tours & Activities API (backed by Musement). No new credentials — same Amadeus keys.

- **`getCityCoordinates()`**: Amadeus `/v1/reference-data/locations/cities` city search → lat/lng
- **`searchAmadeusActivities()`**: `/v1/shopping/activities` by geocode, 20km radius; interest keyword ranking so "culture" trips surface museum/temple activities first
- Returns count, priceRange, up to 10 activities with name/description/price/rating/category
- **SSE event** `{ type: "activities" }`; violet pill `"🎯 10 activities · €15–€89  live"` in results

**When all three Amadeus pills are active, the results header shows:**
```
✈️ BER → NRT · €450–€650 per person  live
🏨 €150–€280/night · 7 nights  live
🎯 10 activities · €15–€89  live
```

### Conversational Plan Refinement (2026-06-22) `1f98b06`
Chat widget on the results page for iterative plan adjustments without leaving the page.

- **`RefinementChat` component**: sits between the AI plan and the SafetyPanel; never blocks the initial load
- **6 quick-chips**: Make it cheaper 💰 / More culture 🏛️ / More adventure ⚡ / Better beaches 🏖️ / Family-friendly 👨‍👩‍👧 / Luxury upgrade ✨
- **Free-text input**: "Add a day trip to the countryside", "Swap the resort for a boutique hotel", etc.
- **`/api/refine`** SSE endpoint: sends current plan + user message to Claude, streams revised plan back token by token
- Plan replaces `aiResult` inline — no page reload, no re-running the original agents
- Each refinement calls `/api/refine` with the **current** (already-refined) plan, so follow-ups stack correctly
- "Refined ×N" badge on the plan card header; previous requests shown as chips at the bottom

### AI Chat Entry Point (2026-06-22) `3a30639`
Conversational alternative to the 6-step wizard — Claude gathers trip details through dialogue.

- **`/chat` page**: clean chat UI, message bubbles, typing indicator, 4 starter-prompt chips
- **`/api/chat`**: Claude with a `plan_trip` tool. System prompt: ask ONE question at a time; call `plan_trip` as soon as destination + travelers are known; default travelers to 2 if unspecified
- When `plan_trip` fires: "Planning your trip to X now…" transition screen → navigate to `/results?destination=…&travelers=…&budget=…&startDate=…&endDate=…&interests=…`
- **Homepage entry**: "Chat with AI →" link below the hero search bar; if the user already typed something in the search box the text is forwarded as `?q=` to `/chat` and auto-sent
- **Nav links**: "Chat" added to desktop nav + mobile menu on homepage

---

## Planned

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| C | **Share Link** | Medium | Public `/trip/[id]` URL — read-only view of a saved plan, shareable on LinkedIn |
| 10 | **Icon upgrade** | Low | Replace emoji with Lucide SVG icons in interest selection |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS + shadcn/ui + OKLCH color tokens |
| AI | `claude-sonnet-4-6` — text planning + vision (photo scan) + tool use |
| Search grounding | Tavily API (fallback when live APIs unavailable) |
| Live prices | Amadeus API — flights, hotels, activities (sandbox free; prod requires approval) |
| Auth | Supabase Auth — magic link, `@supabase/ssr`, middleware session refresh |
| Database | Supabase (trips table, service-key server-side, RLS + public policy) |
| Geo + Weather | Open-Meteo geocoding + forecast (free, no key) |
| Safety data | Auswärtiges Amt open data JSON |
| Hosting | Vercel — push to `main` = auto-deploy |
| Domain | vagamundo.io (Cloudflare transfer available 2026-08-16) |
| MCP server | `~/02_Travel_Agent/mcp-server/server.js` (5 tools, `travel-agent-db` scope) |
