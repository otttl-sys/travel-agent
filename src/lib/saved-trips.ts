export type PriceWatch = {
  lastChecked: string;
  trend: "down" | "up" | "same";
  summary: string;
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
};

const KEY = "ta_saved_trips";

export function getSavedTrips(): SavedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTrip(trip: Omit<SavedTrip, "id" | "savedAt">): void {
  const trips = getSavedTrips();
  const newTrip: SavedTrip = {
    ...trip,
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([newTrip, ...trips]));
}

export function deleteTrip(id: string): void {
  const trips = getSavedTrips().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(trips));
}

export function updatePriceWatch(id: string, priceWatch: PriceWatch): void {
  const trips = getSavedTrips().map((t) => (t.id === id ? { ...t, priceWatch } : t));
  localStorage.setItem(KEY, JSON.stringify(trips));
}
