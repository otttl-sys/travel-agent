# Travel Agent MVP

An AI-powered travel planning app that uses agentic workflows to research flights, hotels, and activities in real time — then synthesizes everything into a structured trip proposal.

**Live demo:** https://travel-agent-ristotto-8650s-projects.vercel.app  
**Stack:** Next.js · Claude API (Anthropic) · Tavily Web Search · Tailwind CSS · shadcn/ui

---

## How it works

```
User fills out form → API route → Claude decides which tools to call
                                        ↓
                          [search_flights]  [search_hotels]  [get_activities]
                                        ↓         ↓               ↓
                                    Tavily    Tavily          Tavily
                                    search    search          search
                                        ↓         ↓               ↓
                          [optimize_budget] ← Claude synthesizes results
                                        ↓
                              Final trip proposal streamed to UI
```

The core pattern is an **agentic loop**: Claude doesn't just answer — it decides what information it needs, calls tools to get it, and only writes the final answer once it has real data.

---

## Architecture

### 3 pages

| Route | What it does |
|---|---|
| `/` | Landing page — explains the product, shows the 4 agent types |
| `/plan` | 6-step onboarding form (destination, dates, travelers, interests, budget) |
| `/results` | Streams the AI response live; shows loading states per tool call |

### 1 API route

`/api/plan` (POST) — the entire AI logic lives here:

1. Receives the user's trip preferences as JSON
2. Sends them to Claude with 4 tools available
3. Runs the **agentic loop** (max 10 iterations):
   - If Claude calls a tool → execute it, stream progress to frontend, feed result back to Claude
   - If Claude writes text → stream the final answer, close the loop
4. Returns a Server-Sent Events (SSE) stream so the frontend updates in real time

### 4 tools Claude can call

| Tool | What it does | Powered by |
|---|---|---|
| `search_flights` | Finds flight options for destination + dates | Tavily Web Search |
| `search_hotels` | Finds hotels by style (budget/comfort/luxury) | Tavily Web Search |
| `get_activities` | Finds things to do based on interests | Tavily Web Search |
| `optimize_budget` | Splits the budget across categories | Local calculation |

Claude calls these tools **in parallel** (via `Promise.all`) to keep latency low.

---

## Key files

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── plan/page.tsx         # 6-step form
│   ├── results/page.tsx      # Streaming results UI
│   └── api/plan/route.ts     # All AI logic: agentic loop + tools
└── components/ui/            # shadcn/ui components (button, card, etc.)
```

---

## Run locally

**Prerequisites:** Node.js 18+, Anthropic API key, Tavily API key

```bash
git clone https://github.com/otttl-sys/travel-agent
cd travel-agent
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## What "agentic" means in practice

A classic chatbot takes your question and answers it from training data.

This app works differently:

1. You ask for a trip to Lisbon in June, budget 2000 EUR
2. Claude receives this — but instead of answering from memory, it decides: "I need current flight prices, hotel options, and things to do"
3. It calls `search_flights`, `search_hotels`, and `get_activities` simultaneously
4. Tavily fetches live web results for each
5. Claude reads those results and calls `optimize_budget` to split the budget
6. Now Claude has real data — and writes the trip proposal

The "loop" is the mechanism that makes steps 3-6 possible: Claude can take multiple turns, calling tools as needed, before it produces a final answer.

---

## Example outputs

Three real queries run against the live API:

### 1 — Lisbon city trip
> 2 people · 9 nights · €1,500/person · interests: city, food, beach

Tool calls: `search_flights` → `search_hotels` → `get_activities` → `optimize_budget`

Budget split: Flights €525 · Hotel €525 · Activities €225 · Food €150 · Transport €75 — **total: €1,500 ✅**

The agent found TAP Air Portugal nonstop routes from FRA/BER (~€260/person), recommended boutique hotels in Chiado (~€115–130/night), and built a day-by-day plan including Sintra, Cascais beach, and the Time Out Market.

---

### 2 — Costa Rica adventure (New Year's Eve)
> 2 people · 14 nights · €3,500/person · interests: adventure, nature, rainforest

Tool calls: `search_flights` → `search_hotels` → `get_activities` → `optimize_budget`

Route: San José → La Fortuna (Arenal) → Monteverde Cloud Forest → Manuel Antonio → San José

Budget split: Flights €1,100 · Hotels €980 · Activities €525 · Food €350 · Transport €175 — **€290/person reserve remaining ✅**

Highlights: New Year's Eve at Arenal volcano, canyoning & waterfall-rappelling, zip-lining through cloud forest canopy, snorkeling on the Pacific coast.

---

### 3 — Tokyo solo
> 1 person · 14 nights · €4,000 · interests: culture, food, anime, technology

Tool calls: `search_flights` → `search_hotels` → `get_activities` → `optimize_budget`

Budget split: Flight €1,400 · Hotel €1,400 · Activities €600 · Food €400 · Transport €200 — **total: €4,000 ✅**

The agent recommended EVA Air Munich–Narita (~€995), Hotel Century Southern Tower in Shinjuku as base, and planned 14 days across Akihabara, teamLab Borderless, Toyosu fish market, and a Nikko day trip for autumn foliage.

---

## Roadmap

- [x] Vercel deployment
- [x] Error state UI when API calls fail
- [ ] Persistent trip history (database)
- [ ] Shareable trip links
- [ ] Multi-destination itineraries
