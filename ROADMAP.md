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

### Share Link (2026-06-23) `5b62d22`
- `/trip/[id]` public server component — AI plan markdown, trip cards, OG meta (LinkedIn preview), CTA
- `GET /api/trips/[id]` — new public endpoint via `supabaseAdmin`
- Share button on results page (after saving) + per-trip on /saved

### Icon Upgrade (2026-06-23) `5b33cfc`
- Lucide SVG icons replace emoji in interest selection: Landmark / Mountain / Waves / Building2 / Zap / UtensilsCrossed / Gem / Leaf / Baby / Music2

### Public Trip Gallery (2026-06-23) `902102c`
- `/explore` page: opt-in public gallery, newest trips first
- "Make Public" toggle on /saved per trip → sets `is_public = true` in Supabase
- `GET /api/trips/public` endpoint; Clone button → `/plan?destination=X&travelers=N`

### Google Calendar Export (2026-06-23) `902102c`
- `GET /api/trips/[id]/calendar` → `.ics` download
- Export buttons on `/saved` and `/trip/[id]`

### Onboarding after Login (2026-06-23) `902102c`
- `/onboarding` page: passport country + home city form
- `POST /api/profile` → upsert into `profiles` table (RLS active)
- Auth callback redirects new users to /onboarding on first login

### Profile Data in Plan Wizard (2026-06-23) `876c126`
- `home_city` from profile → pre-fills origin in Plan Wizard Step 1
- `passport_country` from profile → default in Visa Agent

### PWA Support (2026-06-23) `03ffd1c` + `77c89f3`
- `manifest.json`, `themeColor`, `appleWebApp` — installable from browser on iOS/Android
- Duplicate meta removed, `themeColor` moved to Next.js metadata API

### Clone Trip (2026-06-23) `03ffd1c` + `4019fb3`
- "Plan similar trip →" button on /explore cards → `/plan?destination=X&travelers=N&startDate=…&endDate=…`
- Dates passed in clone params, read from URL in plan wizard

### Culture & Etiquette Agent (2026-06-23) `03ffd1c`
- New 🌍 tab on /saved per trip
- `POST /api/culture` SSE — Tavily research → structured guide: Phrases / Etiquette / Tipping / Dining / Do & Don't

### Nav Cleanup (2026-06-23) `ef48d04`
- Collapsed 9 flat desktop links into: Discover · Explore · Chat · Saved · Tools▾ · [Plan a Trip]
- Tools dropdown: Research / Budget / Disruption / Packing / About

---

### Auth Overhaul + Onboarding Wizard (2026-06-26) `multiple commits`
- **Password auth**: switched from magic link to password sign-up/login
- **Email confirmation disabled** in Supabase → session available immediately after signup
- **Password strength checklist** on signup: 8 chars + uppercase + special char (submit disabled until all green)
- **3-step onboarding wizard** (`/onboarding`):
  - Step 1: Passport country (autocomplete, 100+ countries) + home city
  - Step 2: Group type (Solo/Couple/Family/Group) + budget style (Budget/Mid-range/Luxury)
  - Step 3: Interest chips (8 options)
  - POST → `/api/profile` → Supabase `profiles` table → redirect `/plan`
- **SQL migration**: `profiles` table extended with `travel_style`, `group_type`, `interests[]` columns
- **Resend SMTP**: noreply@vagamundo.ai via smtp.resend.com (SPF pending)
- **Profile sync**: Family group_type auto-adds "family" to interests; home_city pre-fills origin in wizard

### iPhone Feedback Batch 1 (2026-06-26) `e471864`
- App background/switch bug fixed: `visibilitychange` listener shows retry UI instead of broken stream
- Separate "include flights" + "include hotel" checkboxes in budget step (both default ON)
- Per-category budget sliders on results page; total budget editable inline
- "✏️ Edit Search" button pre-fills /plan with current search params
- TripCard itinerary blocks individually collapsible + collapse-all / expand-all
- BookingSection: in-app expandable cards with description + deep link (not bare external links)
- Viator + Klook added to booking options (8 providers total)
- AI prompt: transit always includes station names + times; "why selected" per stop; occupancy outlook
- 8 trip option tiers (up from 5): ultra-budget → hostel → balanced → comfort → premium → biz → boutique luxury → ultra-luxury
- Refinement chat now shows animated progress bar while AI is working
- Icons: Compass/Tent/TreePine/Crown/Wind/Sparkles for interests; 🧭🛫🌍🗞️ for agents
- Mobile nav: "Plan a trip" full label; wider gap between logo and action buttons
- `showPicker()` called on return date after departure pick for better mobile UX

### vagamundo.ai domain (2026-06-26)
- Registered on Cloudflare Registrar (~$140/yr, Anguilla ccTLD)
- DNS: `A vagamundo.ai → 76.76.21.21` + `CNAME www → cname.vercel-dns.com` (both DNS only, no proxy)
- Added to Vercel project; SSL certificate issued; both `vagamundo.ai` and `www.vagamundo.ai` → Production ✅

### UX-Batch 3 (2026-06-26) `e7457a0` + `a2226a1` + `db1ea0b`

**Complete Emoji → Lucide Icon Sweep** (`results/page.tsx` + `saved/page.tsx`):
- Budget Tracker: `Coins` header, `Plane/BedDouble/Compass/UtensilsCrossed/Bus` category icons
- Book Direct: `ExternalLink` header, all 8 providers use Dark Stamp Lucide icons, `MapPin` inline
- Refinement Chat: `Bot` header, 6 chips with `CircleDollarSign/Landmark/Zap/Waves/Users/Sparkles`, `Mic`/`Square` voice button
- Family/Adventure badges: `Users`/`Zap` inline icons
- saved/page.tsx: `Users` traveler count, `Coins` budget, `TrendingDown/TrendingUp/Minus` trend badges, `Loader2` spinners, `CalendarPlus`/`PartyPopper`/`Check` action buttons

**Bug Fixes:**
- **Budget Tracker flights/hotel bug**: `BudgetTracker` now receives `includeFlights`+`includeHotel` from `searchParams`, filters `BUDGET_CATEGORIES` → `activeCategories`
- **Collapsible plan sections**: `splitPlanSections()` splits markdown at `## ` headings; `CollapsiblePlanContent` component with `Set<number>` collapse state + ChevronDown toggle
- **Missing space between AI chunks**: `.join(" ")` + regex `([.!?:])([A-Z][a-z]) → "$1 $2"` in `route.ts`
- **Auswärtiges Amt 404**: uses `contentUrl` from AA open data API per country; fallback `/de/service/laender-informationen`
- **Collapsible spacing**: `mt-3` between heading button and content area

**System prompt**: "no emojis" rule added to all AI prompts

---

### Destination Scanner — Drag & Drop (2026-07-04) `9907e34`
- Photo upload for the Destination Scanner now accepts drag & drop, not just click-to-browse
- Trigger element changed from `<button>` to `<div role="button">`: dropping a file directly onto a `<button>` made Chrome also fire a click, reopening the OS file picker and clobbering the drop
- Drag-over visual feedback ("Drop photo here" state + highlighted border)

---

### N4 — Playwright QA Suite (2026-07-04) `9faa9ac`
- `tests/e2e/`: happy path (onboarding skip → 6-step plan wizard → results), standalone `/budget` flow, itinerary collapsible sections — each on desktop (1280px, Chromium) and mobile (390px, WebKit/iPhone 12)
- `/api/plan` + `/api/budget` mocked at the network layer (canned SSE) so runs are deterministic, fast, and don't touch the real Anthropic/Tavily backend
- `npm run test:e2e` (headless) / `npm run test:e2e:ui` (interactive)
- **Found & worked around**: the results/budget pages get stuck loading forever under `next dev` — React Strict Mode double-invokes the fetch `useEffect`, and its cleanup calls `controller.abort()` on the very first (real) request, which no one retries. Doesn't affect production (no double-invoke there), but it means anyone testing the AI streaming flow locally in dev mode will see it hang. Suite now runs against a production build (`next build && next start -p 3100`) instead of dev to sidestep it — worth a real fix later (e.g. guard the abort so it only fires for a genuinely superseded request).

---

## Planned

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| N1 | **Child age/gender for Family Mode** | High | Optional "Family details" text field in plan wizard when Family group type selected (e.g. "13-year-old daughter"). Injected into family system prompt. Also in /onboarding Step 2. |
| N2 | **Language selector EFIGS** | High | En/Fr/It/De/Es picker in plan wizard or persistent nav setting. Passed as `language` param; system prompt: "Write the plan in [Language]." |
| N3 | **Swipeable day-by-day timeline** | Medium | Horizontal swipe/carousel for itinerary days. CSS scroll-snap + card per day. Parses `### Day X —` blocks from AI markdown. Arrow buttons + keyboard for desktop. |
| N5 | **iOS touch fallback** | Low | Autocomplete dropdown `onTouchStart` instead of `onMouseDown` (Safari iOS) |
| N6 | **Booking.com affiliate widget** | Medium | Apply for Booking.com affiliate (partners.booking.com) — free. Embedded search widget in-app. |
| N7 | **SPF Resend vagamundo.ai** | Low | DNS pending (Cloudflare auto-configure) |
| N8 | **vagamundo.io → Cloudflare transfer** | Low | Transfer lock expires 2026-08-16. ~$10/yr vs current €75/yr. |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + React |
| Styling | Tailwind CSS + shadcn/ui + OKLCH color tokens |
| Icon system | Lucide React — Dark Stamp pattern (`w-8 h-8 rounded-md bg-foreground`) |
| AI | `claude-sonnet-4-6` — text planning + vision (photo scan) + tool use |
| Search grounding | Tavily API (fallback when live APIs unavailable) |
| Live prices | Amadeus API — code built, keys deactivated (LH partnership conflict) |
| Auth | Supabase Auth — password login, email confirm OFF, `@supabase/ssr`, middleware session refresh |
| Database | Supabase (`trips` + `profiles` tables, service-key server-side, RLS active) |
| Email | Resend SMTP — noreply@vagamundo.ai (SPF pending) |
| Geo + Weather | Open-Meteo geocoding + forecast (free, no key) |
| Safety data | Auswärtiges Amt open data JSON + `contentUrl` per country |
| Hosting | Vercel — push to `main` = auto-deploy |
| Domain | vagamundo.ai (Cloudflare, live ✅) · vagamundo.io (Strato, transfer available 2026-08-16) |
| MCP server | `~/02_Travel_Agent/mcp-server/server.js` (5 tools, `travel-agent-db` scope) |
