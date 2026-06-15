import type { DaySchedule } from "@/components/day-timeline";
import type { BriefingSection } from "@/components/briefing-card";
import type { EventItem } from "@/components/events-list";
import type { VisaRequirement, EVisaAction } from "@/components/visa-card";
import type { BudgetEstimate } from "@/components/budget-breakdown";
import type { ChatMessage } from "@/components/concierge-chat";
import type { NearbyPlace } from "@/lib/google-maps";

export type PriceWatch = {
  lastChecked: string;
  trend: "down" | "up" | "same";
  summary: string;
};

export type DayPlan = {
  generatedAt: string;
  days: DaySchedule[];
};

export type Briefing = {
  generatedAt: string;
  sections: BriefingSection[];
};

export type EventsResult = {
  generatedAt: string;
  events: EventItem[];
};

export type BudgetResult = {
  generatedAt: string;
  estimate: BudgetEstimate;
};

export type VisaResult = {
  generatedAt: string;
  passport: string;
  requirements: VisaRequirement[];
  eVisaActions?: EVisaAction[];
  disclaimer: string;
};

export type ConversationThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

export type SavedTrip = {
  id: string;
  destination: string;
  isMultiCity: boolean;
  cities: string[];
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  aiResult: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards: any[] | null;
  savedAt: string;
  priceWatch?: PriceWatch;
  dayPlan?: DayPlan;
  briefing?: Briefing;
  events?: EventsResult;
  visa?: VisaResult;
  budgetResult?: BudgetResult;
  conversations?: ConversationThread[];
  nearbyPlaces?: NearbyPlace[];
  baselineFlights?: number | null;
  baselineHotel?: number | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: Record<string, any>): SavedTrip {
  return {
    id: row.id,
    destination: row.destination,
    isMultiCity: row.is_multi_city ?? false,
    cities: row.cities ?? [],
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    travelers: row.travelers ?? 1,
    budget: row.budget ?? 0,
    aiResult: row.ai_result ?? '',
    cards: row.cards ?? null,
    savedAt: row.saved_at,
    priceWatch: row.price_watch ?? undefined,
    dayPlan: row.day_plan ?? undefined,
    briefing: row.briefing ?? undefined,
    events: row.events ?? undefined,
    visa: row.visa ?? undefined,
    budgetResult: row.budget_result ?? undefined,
    conversations: row.conversations ?? undefined,
    nearbyPlaces: row.nearby_places ?? undefined,
    baselineFlights: row.baseline_flights ?? null,
    baselineHotel: row.baseline_hotel ?? null,
  };
}

// One-time migration: import any trips still in localStorage via the trips API
async function migrateFromLocalStorage(existing: SavedTrip[]): Promise<SavedTrip[]> {
  if (typeof window === 'undefined') return existing;
  const raw = localStorage.getItem('ta_saved_trips');
  if (!raw) return existing;
  let local: SavedTrip[];
  try { local = JSON.parse(raw); } catch { return existing; }
  if (!local.length) return existing;

  const existingIds = new Set(existing.map(t => t.id));
  const toInsert = local.filter(t => !existingIds.has(t.id));

  for (const t of toInsert) {
    await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id,
        destination: t.destination,
        is_multi_city: t.isMultiCity,
        cities: t.cities,
        start_date: t.startDate,
        end_date: t.endDate,
        travelers: t.travelers,
        budget: t.budget,
        ai_result: t.aiResult,
        cards: t.cards,
        saved_at: t.savedAt,
        baseline_flights: t.cards?.[0]?.budget?.flights ?? null,
        baseline_hotel: t.cards?.[0]?.budget?.hotel ?? null,
      }),
    });
  }
  localStorage.removeItem('ta_saved_trips');
  return toInsert.length ? [...toInsert, ...existing] : existing;
}

export async function getSavedTrips(): Promise<SavedTrip[]> {
  const res = await fetch('/api/trips');
  if (!res.ok) return [];
  const { data } = await res.json();
  const trips = (data ?? []).map(fromRow);
  return migrateFromLocalStorage(trips);
}

export async function saveTrip(trip: Omit<SavedTrip, 'id' | 'savedAt'>): Promise<void> {
  const baseline = trip.cards?.[0]?.budget;
  await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Date.now().toString(),
      destination: trip.destination,
      is_multi_city: trip.isMultiCity,
      cities: trip.cities,
      start_date: trip.startDate,
      end_date: trip.endDate,
      travelers: trip.travelers,
      budget: trip.budget,
      ai_result: trip.aiResult,
      cards: trip.cards,
      saved_at: new Date().toISOString(),
      baseline_flights: baseline?.flights ?? null,
      baseline_hotel: baseline?.hotel ?? null,
    }),
  });
}

export async function deleteTrip(id: string): Promise<void> {
  await fetch(`/api/trips/${id}`, { method: 'DELETE' });
}

export async function updatePriceWatch(id: string, priceWatch: PriceWatch): Promise<void> {
  await patchTrip(id, { price_watch: priceWatch });
}

export async function updateDayPlan(id: string, dayPlan: DayPlan): Promise<void> {
  await patchTrip(id, { day_plan: dayPlan });
}

export async function updateBriefing(id: string, briefing: Briefing): Promise<void> {
  await patchTrip(id, { briefing });
}

export async function updateEvents(id: string, events: EventsResult): Promise<void> {
  await patchTrip(id, { events });
}

export async function updateVisa(id: string, visa: VisaResult): Promise<void> {
  await patchTrip(id, { visa });
}

export async function updateBudget(id: string, budgetResult: BudgetResult): Promise<void> {
  await patchTrip(id, { budget_result: budgetResult });
}

export async function updateConversations(id: string, conversations: ConversationThread[]): Promise<void> {
  await patchTrip(id, { conversations });
}

export async function updateNearbyPlaces(id: string, nearbyPlaces: NearbyPlace[]): Promise<void> {
  await patchTrip(id, { nearby_places: nearbyPlaces });
}

async function patchTrip(id: string, fields: Record<string, unknown>): Promise<void> {
  await fetch(`/api/trips/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}
