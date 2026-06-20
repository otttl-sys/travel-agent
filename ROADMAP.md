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

---

## Planned

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 5 | **Family mode** | Medium | Auto-detects "Familie" interest → AI adapts for kid-friendly activities, avoids harsh hikes, adds family cost breakdown |
| 6 | **Login / profile** | Medium | Supabase auth → persist origin, interests, budget server-side; show saved searches |
| 7 | **Real flight prices** | High | Amadeus API — live prices from BER/MUC/FRA |
| 8 | **Real hotel prices** | High | Booking.com Affiliate API or Amadeus Hotel Search |
| 9 | **Real activities** | Medium | Viator Affiliate API or GetYourGuide Partner API |
| 10 | **Icon upgrade** | Low | Replace emoji with Lucide SVG icons in interest selection |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + React 18 |
| Styling | Tailwind CSS + shadcn/ui + OKLCH color tokens |
| AI | `claude-sonnet-4-6` — text planning + vision (photo scan) |
| Search grounding | Tavily API |
| Database | Supabase (trips table, service-key server-side) |
| Geo + Weather | Open-Meteo geocoding + forecast (free, no key) |
| Safety data | Auswärtiges Amt open data JSON |
| Hosting | Vercel — push to `main` = auto-deploy |
| MCP server | `~/02_Travel_Agent/mcp-server/server.js` (5 tools, `travel-agent-db` scope) |
| Domain | vagamundo.io (Cloudflare transfer available 2026-08-16) |
