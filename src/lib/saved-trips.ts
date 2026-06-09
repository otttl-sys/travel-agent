import { supabase } from './supabase'
import type { DaySchedule } from "@/components/day-timeline";
import type { BriefingSection } from "@/components/briefing-card";
import type { EventItem } from "@/components/events-list";
import type { VisaRequirement, EVisaAction } from "@/components/visa-card";
import type { BudgetEstimate } from "@/components/budget-breakdown";

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
  };
}

export async function getSavedTrips(): Promise<SavedTrip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('saved_at', { ascending: false });
  if (error || !data) return [];
  return data.map(fromRow);
}

export async function saveTrip(trip: Omit<SavedTrip, 'id' | 'savedAt'>): Promise<void> {
  await supabase.from('trips').insert({
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
  });
}

export async function deleteTrip(id: string): Promise<void> {
  await supabase.from('trips').delete().eq('id', id);
}

export async function updatePriceWatch(id: string, priceWatch: PriceWatch): Promise<void> {
  await supabase.from('trips').update({ price_watch: priceWatch }).eq('id', id);
}

export async function updateDayPlan(id: string, dayPlan: DayPlan): Promise<void> {
  await supabase.from('trips').update({ day_plan: dayPlan }).eq('id', id);
}

export async function updateBriefing(id: string, briefing: Briefing): Promise<void> {
  await supabase.from('trips').update({ briefing }).eq('id', id);
}

export async function updateEvents(id: string, events: EventsResult): Promise<void> {
  await supabase.from('trips').update({ events }).eq('id', id);
}

export async function updateVisa(id: string, visa: VisaResult): Promise<void> {
  await supabase.from('trips').update({ visa }).eq('id', id);
}

export async function updateBudget(id: string, budgetResult: BudgetResult): Promise<void> {
  await supabase.from('trips').update({ budget_result: budgetResult }).eq('id', id);
}
