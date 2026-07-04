import type { Page } from "@playwright/test";

const MOCK_ITINERARY = `Your trip to Lisbon is ready — a great mix of culture, food and coastline for a first-timer.

## Overview
A 5-day introduction to Lisbon covering the historic center, Belém and a day trip to Sintra.

## Itinerary
### Day 1 — Arrival & Alfama
Explore the old town, climb to Miradouro views, dinner in Alfama.

### Day 2 — Belém & Riverfront
Jerónimos Monastery, Belém Tower, pastéis de nata at the original bakery.

### Day 3 — Sintra Day Trip
Pena Palace, Quinta da Regaleira, return by early evening train.

## Packing List
- Comfortable walking shoes (hills!)
- Light rain jacket
- Adapter (Type F)

## Budget Breakdown
Flights ~€350, hotel ~€600, food & activities ~€400 per person.
`;

function sseChunk(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Intercepts POST /api/plan and returns a canned SSE stream so results
 * render deterministically without hitting the real Anthropic/Tavily backend. */
export async function mockPlanEndpoint(page: Page, itinerary = MOCK_ITINERARY) {
  await page.route("**/api/plan", async (route) => {
    const body =
      sseChunk({ type: "tool_call", id: "t1", tool: "search_flights", input: {}, iteration: 1 }) +
      sseChunk({ type: "tool_done", id: "t1" }) +
      sseChunk({ type: "token", text: itinerary }) +
      sseChunk({ type: "result", text: itinerary }) +
      sseChunk({ type: "cards", cards: [] }) +
      "data: [DONE]\n\n";

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

const MOCK_BUDGET_LINES = [
  { category: "flights", icon: "plane", amountPerPerson: 350, amountTotal: 700, notes: "Round-trip economy" },
  { category: "hotel", icon: "bed", amountPerPerson: 600, amountTotal: 1200, notes: "3-star, central" },
  { category: "food", icon: "food", amountPerPerson: 400, amountTotal: 800, notes: "Mid-range restaurants" },
];

/** Intercepts POST /api/budget and returns a canned SSE stream with a fixed
 * verdict so the budget flow renders deterministically. */
export async function mockBudgetEndpoint(page: Page) {
  await page.route("**/api/budget", async (route) => {
    const body =
      sseChunk({ type: "tool_call", id: "b1", tool: "research_costs", input: {}, iteration: 1 }) +
      sseChunk({ type: "tool_done", id: "b1" }) +
      sseChunk({
        type: "budget",
        lines: MOCK_BUDGET_LINES,
        totalPerPerson: 1350,
        totalAll: 2700,
        verdict: "tight",
        verdictNote: "Doable, but little room for extras.",
      }) +
      "data: [DONE]\n\n";

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}
