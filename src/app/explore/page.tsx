import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Explore trips · Vagamundo",
  description: "Browse AI-planned trips shared by travellers worldwide.",
};

// Destination keyword → Unsplash photo ID (reused from /trip/[id])
const DESTINATION_PHOTOS: [string[], string][] = [
  [["japan", "tokyo", "kyoto", "osaka"],         "photo-1540959733332-eab4deabeeaf"],
  [["portugal", "lisbon", "porto"],              "photo-1555881400-74d7acaacd8b"],
  [["morocco", "marrakech", "fez"],              "photo-1539020140153-e479b8c22e70"],
  [["bali", "indonesia"],                        "photo-1537996194471-e657df975ab4"],
  [["greece", "santorini", "athens", "mykonos"], "photo-1533105079780-92b9be482077"],
  [["italy", "rome", "venice", "florence"],      "photo-1523906834658-6e24ef2386f9"],
  [["thailand", "bangkok", "phuket", "chiang"],  "photo-1528360983277-13d401cdc186"],
  [["france", "paris"],                          "photo-1502602898657-3e91760cbb34"],
  [["spain", "barcelona", "madrid", "seville"],  "photo-1539037116277-4db20889f2d4"],
  [["colombia", "cartagena", "medellin"],        "photo-1566438480900-0609be27a4be"],
  [["brazil", "rio"],                            "photo-1483729558449-99ef09a8c325"],
  [["kenya", "safari", "nairobi"],               "photo-1516026672322-bc52d61a55d5"],
  [["vietnam", "hanoi", "ho chi minh"],          "photo-1559592413-7cec4d0cae2b"],
  [["dubai", "abu dhabi", "uae"],                "photo-1512453979798-5ea266f8880c"],
  [["iceland", "reykjavik"],                     "photo-1504893524553-b855bce32c67"],
  [["maldives"],                                 "photo-1514282401047-d79a71a590e8"],
  [["peru", "machu picchu", "lima"],             "photo-1526392060635-9d6019884377"],
  [["mexico", "cancun", "oaxaca"],               "photo-1518638150340-f706e86654de"],
  [["india", "taj mahal", "delhi", "mumbai"],    "photo-1506905925346-21bda4d32df4"],
  [["turkey", "istanbul"],                       "photo-1524231757912-21f4fe3a7200"],
  [["patagonia", "chile", "argentina"],          "photo-1501854140801-50d01698950b"],
  [["new zealand"],                              "photo-1469521669194-babb45599def"],
  [["australia", "sydney", "melbourne"],         "photo-1523482580672-f109ba8cb9be"],
  [["canada", "toronto", "vancouver"],           "photo-1534430480872-3498386e7856"],
];
const FALLBACK_PHOTO = "photo-1488646953014-85cb44e25828";

function getPhoto(dest: string): string {
  const lower = dest.toLowerCase();
  for (const [kws, id] of DESTINATION_PHOTOS) {
    if (kws.some((k) => lower.includes(k))) return id;
  }
  return FALLBACK_PHOTO;
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBudgetLabel(cards: any[] | null): string | null {
  if (!cards?.length) return null;
  const balanced = cards.find((c) => c.tier === "balanced") ?? cards[1] ?? cards[0];
  const price = balanced?.price ?? balanced?.budget?.total;
  if (!price) return null;
  return `~€${Number(price).toLocaleString()}`;
}

type PublicTrip = {
  id: string;
  destination: string;
  is_multi_city: boolean;
  cities: string[];
  start_date: string;
  end_date: string;
  travelers: number;
  budget: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards: any[] | null;
  saved_at: string;
};

async function getPublicTrips(): Promise<PublicTrip[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/trips/public`, { cache: "no-store" });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ExplorePage() {
  const trips = await getPublicTrips();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">
            Community trips
          </p>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-[-0.03em] text-foreground mb-3">
            Explore
          </h1>
          <p className="text-muted-foreground text-base max-w-xl">
            AI-planned trips shared by real travellers. Find inspiration, then plan your own in seconds.
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mb-4 mx-auto">
              <Globe size={20} strokeWidth={1.5} className="text-background" />
            </div>
            <p className="text-lg font-heading font-bold text-foreground mb-2">No public trips yet</p>
            <p className="text-muted-foreground text-sm mb-6">
              Be the first — plan a trip and share it from your Saved Trips.
            </p>
            <Link href="/plan">
              <Button>Plan a trip →</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            {(() => {
              const destCounts: Record<string, number> = {};
              let totalBudget = 0; let budgetCount = 0;
              for (const t of trips) {
                const d = t.destination || (t.cities?.[0] ?? "Unknown");
                destCounts[d] = (destCounts[d] ?? 0) + 1;
                if (t.budget) { totalBudget += t.budget; budgetCount++; }
              }
              const topDests = Object.entries(destCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
              const avgBudget = budgetCount > 0 ? Math.round(totalBudget / budgetCount) : null;
              return (
                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                    <Globe size={12} strokeWidth={1.5} className="shrink-0" /> <span className="font-medium text-foreground">{trips.length}</span> {trips.length === 1 ? "trip" : "trips"} shared
                  </span>
                  {topDests.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      🔥 Top: <span className="font-medium text-foreground">{topDests.join(", ")}</span>
                    </span>
                  )}
                  {avgBudget && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      💶 Avg budget: <span className="font-medium text-foreground">€{avgBudget.toLocaleString()}</span>
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => {
                const dest = trip.is_multi_city && trip.cities?.length
                  ? trip.cities.join(" · ")
                  : trip.destination;
                const photo = getPhoto(trip.destination);
                const budgetLabel = getBudgetLabel(trip.cards);
                const cloneParams = new URLSearchParams({
                  destination: trip.destination,
                  travelers: String(trip.travelers ?? 2),
                  ...(trip.budget ? { budget: String(trip.budget) } : {}),
                  ...(trip.start_date ? { startDate: trip.start_date } : {}),
                  ...(trip.end_date ? { endDate: trip.end_date } : {}),
                }).toString();

                return (
                  <div
                    key={trip.id}
                    className="group flex flex-col rounded-2xl border border-border overflow-hidden bg-surface hover:border-foreground/30 transition-colors"
                  >
                    {/* Photo */}
                    <Link href={`/trip/${trip.id}`} className="block">
                      <div className="relative h-44 overflow-hidden bg-muted">
                        <Image
                          src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=75`}
                          alt={dest}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <Link href={`/trip/${trip.id}`}>
                        <h2 className="font-heading font-extrabold text-lg tracking-[-0.02em] text-foreground line-clamp-1 hover:text-brand transition-colors">
                          {dest}
                        </h2>
                      </Link>

                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {trip.start_date && (
                          <span>{formatDate(trip.start_date)}</span>
                        )}
                        {trip.start_date && trip.end_date && <span>·</span>}
                        {trip.end_date && (
                          <span>{formatDate(trip.end_date)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {trip.travelers} {trip.travelers === 1 ? "traveller" : "travellers"}
                        </Badge>
                        {budgetLabel && (
                          <Badge variant="outline" className="text-[10px]">
                            {budgetLabel}
                          </Badge>
                        )}
                      </div>

                      <Link href={`/plan?${cloneParams}`} className="block mt-2">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          Plan similar trip →
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">Want to add yours?</p>
              <Link href="/plan">
                <Button variant="outline">Plan a trip →</Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
