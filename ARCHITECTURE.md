# ARCHITECTURE.md – Travel Agent

## Architekturprinzip

Next.js-App (App Router) als "Trip Hub": jede Reise ist ein Datensatz in
Supabase, der von mehreren unabhängigen Agent-Modulen (Planung, Briefing,
Events, Visa, Budget, Concierge, Price Watch, Disruption) gemeinsam genutzt
und ergänzt wird. Jedes Modul ist eine eigene API-Route mit eigenem
Claude-Tool-Loop (Anthropic SDK + Tavily-Suche, optional Google Maps/Sherpa),
schreibt sein Ergebnis aber in dasselbe `trips`-Row. Ein separater MCP-Server
gibt Claude (außerhalb der App) Lesezugriff auf diese Trips.

```text
02_Travel_Agent/
├── travel-agent/                # Next.js 16 App (Vercel-deployed)
│   ├── src/app/
│   │   ├── page.tsx              # Landing/Suche
│   │   ├── plan/page.tsx         # Multi-Step-Formular (6 Schritte) → /api/plan
│   │   ├── results/page.tsx      # Plan-Ergebnis, "Save Trip"
│   │   ├── saved/page.tsx        # Trip-Hub: gespeicherte Trips + alle Module
│   │   ├── research/page.tsx     # Standalone Destination-Recherche → /api/research
│   │   ├── packing/page.tsx      # Packlisten-Generator → /api/packing
│   │   ├── disruption/page.tsx   # Flugausfall/-verspätung Hilfe → /api/disruption
│   │   ├── agentic-commerce/page.tsx  # Projekt-Erklärseite (Marketing/Doku)
│   │   └── api/
│   │       ├── plan/route.ts          # Haupt-Reiseplan (Flüge, Hotels, Itinerary)
│   │       ├── itinerary/route.ts     # Tag-für-Tag-Plan (search_logistics + Maps)
│   │       ├── briefing/route.ts      # Vorab-Briefing (Wetter/Saison/Tipps)
│   │       ├── events/route.ts        # Lokale Events/Festivals im Zeitraum
│   │       ├── budget/route.ts        # Kostenschätzung (Flüge/Hotels/Essen)
│   │       ├── visa/route.ts          # Visa-Anforderungen (Sherpa oder Tavily)
│   │       ├── concierge/route.ts     # Chat während der Reise (Maps + Web)
│   │       ├── disruption/route.ts    # Flugstatus + Alternativen bei Disruption
│   │       ├── price-watch/route.ts   # Einmaliger Preis-Check für einen Trip
│   │       ├── watchdog/route.ts      # Batch-Preis-Check ALLER künftigen Trips (Cron)
│   │       ├── packing/route.ts       # Packliste (Streaming)
│   │       ├── weather/route.ts       # Open-Meteo Wetter (geocode via Maps)
│   │       ├── map-image/route.ts     # Google Static Maps Proxy
│   │       └── trips/
│   │           ├── route.ts           # GET (Liste) / POST (anlegen) – Supabase
│   │           └── [id]/route.ts      # PATCH (Teilupdate einzelner Module)
│   ├── src/components/           # UI: AgentTrace, BriefingCard, DayTimeline,
│   │                              #     EventsList, VisaCard, ConciergeChat,
│   │                              #     BudgetBreakdown, TripMap, ui/* (shadcn)
│   └── src/lib/
│       ├── saved-trips.ts         # Client-API zu /api/trips (CRUD + Modul-Updates)
│       ├── supabase-admin.ts      # Server-only Supabase-Client (Secret Key, bypass RLS)
│       ├── google-maps.ts         # Geocoding, Nearby Search, Static Maps
│       ├── sherpa.ts              # Sherpa-Visa-API Mapping (Fast-Path für /api/visa)
│       └── utils.ts
└── mcp-server/                   # Separater MCP-Server "travel-agent-db"
    └── server.js                  # 5 Tools: list/get/search/delete/update_price_watch
```

## Datenmodell: `trips` (Supabase, RLS aktiv)

Eine Zeile pro Reise. Stammdaten (`destination`, `cities`, `start_date`,
`end_date`, `travelers`, `budget`, `ai_result`, `cards`) werden bei
`saveTrip()` aus `/api/plan` angelegt. Jedes weitere Modul schreibt sein
Ergebnis als eigene JSON-Spalte per `PATCH /api/trips/[id]`:

| Spalte | Modul | Typ |
|---|---|---|
| `price_watch` | Price Watch / Watchdog | `{ lastChecked, trend, summary }` |
| `day_plan` | Itinerary | `{ generatedAt, days: DaySchedule[] }` |
| `briefing` | Briefing | `{ generatedAt, sections }` |
| `events` | Events | `{ generatedAt, events }` |
| `visa` | Visa/Sherpa | `{ passport, requirements, eVisaActions, disclaimer }` |
| `budget_result` | Budget | `{ generatedAt, estimate }` |
| `conversations` | Concierge | `ConversationThread[]` |
| `nearby_places` | Maps (Mikrolage) | `NearbyPlace[]` |

Lesezugriff aus der App läuft über `/api/trips` (Secret Key, server-side,
RLS-bypass via `supabaseAdmin`). Der MCP-Server (`travel-agent-db`) nutzt
denselben Secret Key für Claude-Zugriff außerhalb der App.

## Datenfluss (Beispiel: Trip planen → anreichern)

```text
/plan (6-Step-Form)
   → POST /api/plan  (Claude + search_flights/hotels Tools via Tavily)
   → /results        → saveTrip() → POST /api/trips  (neue Zeile)
   → /saved          → getSavedTrips() (GET /api/trips)
       ├─→ Briefing-Tab    → POST /api/briefing   → PATCH /api/trips/[id] (briefing)
       ├─→ Itinerary-Tab   → POST /api/itinerary  → PATCH (day_plan)
       ├─→ Events-Tab      → POST /api/events     → PATCH (events)
       ├─→ Visa-Tab        → POST /api/visa       → PATCH (visa)
       ├─→ Budget-Tab      → POST /api/budget     → PATCH (budget_result)
       ├─→ Concierge-Chat  → POST /api/concierge  → PATCH (conversations)
       └─→ Nearby Places   → google-maps.ts (searchNearby) → PATCH (nearby_places)
```

## Price Watchdog (RemoteTrigger, alle 3 Tage)

`GET /api/watchdog` (Cron-Secret-geschützt) lädt alle Trips mit
`start_date >= heute`, prüft je Trip per Claude+Tavily aktuelle Flugpreise
(`checkTrip`), schreibt `price_watch` zurück und sendet bei `trend: "down"`
eine Alert (`sendAlert`). Separat existiert `/api/price-watch` für den
manuellen Einzel-Check eines Trips aus der UI.

## Tech Stack

| Bereich | Wahl |
|---|---|
| Framework | Next.js 16 (App Router, React 19), Vercel |
| LLM | Anthropic SDK (`claude-sonnet-4-6`), Tool-Use-Loops pro Modul |
| Web-Suche | Tavily |
| Geo/Karten | Google Maps (Geocoding, Nearby Search, Static Maps) |
| Visa-Daten | Sherpa API (Fast-Path), Fallback Tavily |
| Persistenz | Supabase (Postgres, RLS, `trips`-Tabelle) |
| MCP | `travel-agent-db` (Node/stdio, 5 Tools) – Claude-Zugriff außerhalb der App |
| Secrets | Doppler (Projekt `travel-agent`) |
| UI | Tailwind 4, shadcn/ui, react-markdown |

## Geplante Erweiterungen

Siehe [TRIP_HUB_PLAN.md](TRIP_HUB_PLAN.md) für das Trip-as-Hub-Redesign
(abgeschlossen) sowie offene Punkte: Datenmodell-Audit, Sherpa-Visa-Ausbau,
GetYourGuide/Eventseekr-Integration für Events-Modul.
