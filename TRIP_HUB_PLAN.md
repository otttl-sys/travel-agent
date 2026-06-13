# Trip-as-Hub Redesign — Implementation Plan

Inspired by Mindtrip's trip-hub UX (webinar 11.6.2026): persistent split-pane map +
unified conversational "Ideas" view with chat history, layered onto the existing
8-agent `/saved` page rather than replacing it.

Each step below is independently shippable (own commit + deploy + verify), sized
for a single short session.

## Phase A — Persistent Map Pane (foundation)

- [x] **A1. Extract `<TripMap>` component**
  - New `src/components/trip-map.tsx`, wraps `/api/map-image`
  - Props: `destination: string`, `markers?: {lat, lng, label}[]`
  - Extend `staticMapUrl()` in `google-maps.ts` to accept extra marker points (currently only centers on destination)

- [x] **A2. Two-column layout for expanded trip card**
  - `/saved/page.tsx`: when a tab is open, render `[ tab content | <TripMap> ]` grid (stacks on mobile)
  - Map shows destination by default, no markers yet — visually matches Mindtrip's persistent pane

- [x] **A3. Wire briefing markers**
  - When `briefing` tab active and `nearbyPlaces[trip.id]` populated, pass those as markers to `<TripMap>`

- [x] **A4. Wire day-plan markers**
  - When `day-plan` tab active, pass that day's venues (from `DaySchedule`) as markers

- [x] **A5. Wire events markers**
  - When `events` tab active, pass `EventItem` locations as markers

## Phase B — Ideas Tab Consolidation

- [x] **B1. New "Ideas" tab**
  - Add `ideas` to `TabId`, positioned first (replaces default-open behavior of `plan`)
  - Reuses `ConciergeChat` component as the primary input — chat-first entry point per trip

- [x] **B2. "Chats" history list**
  - Persist concierge conversation(s) per trip in Supabase (`saved-trips.ts` already has `conversations` pattern — check if persisted or session-only)
  - Render a list of past chat threads at top of Ideas tab (Mindtrip pattern: "Chats · 1" → click to reopen)

- [ ] **B3. (optional, later) Surface briefing/events as cards in Ideas chat**
  - Lower priority — only if A+B1+B2 land well and there's appetite to continue

## Notes
- No tab renames/removals — `plan`, `day-plan`, `visa`, `budget`, `weather` keep their current structured views
- `concierge` tab can be removed once `ideas` (B1) supersedes it, but only after B1 is verified working
- Each step: implement → `npx tsc --noEmit` → test in browser (dev server) → commit → deploy → Playwright/manual verify on prod
