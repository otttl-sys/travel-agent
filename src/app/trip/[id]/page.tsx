import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { TripMap } from "@/components/trip-map";

type Props = { params: Promise<{ id: string }> };

// Destination keyword → Unsplash photo ID
const DESTINATION_PHOTOS: [string[], string][] = [
  [["japan", "tokyo", "kyoto", "osaka"],        "photo-1540959733332-eab4deabeeaf"],
  [["portugal", "lisbon", "porto"],             "photo-1555881400-74d7acaacd8b"],
  [["morocco", "marrakech", "fez"],             "photo-1539020140153-e479b8c22e70"],
  [["bali", "indonesia"],                       "photo-1537996194471-e657df975ab4"],
  [["greece", "santorini", "athens", "mykonos"],"photo-1533105079780-92b9be482077"],
  [["italy", "rome", "venice", "florence"],     "photo-1523906834658-6e24ef2386f9"],
  [["thailand", "bangkok", "phuket", "chiang"], "photo-1528360983277-13d401cdc186"],
  [["france", "paris"],                         "photo-1502602898657-3e91760cbb34"],
  [["spain", "barcelona", "madrid", "seville"], "photo-1539037116277-4db20889f2d4"],
  [["colombia", "cartagena", "medellin"],       "photo-1566438480900-0609be27a4be"],
  [["brazil", "rio", "são paulo"],              "photo-1483729558449-99ef09a8c325"],
  [["kenya", "safari", "nairobi"],              "photo-1516026672322-bc52d61a55d5"],
  [["vietnam", "hanoi", "ho chi minh"],         "photo-1559592413-7cec4d0cae2b"],
  [["dubai", "abu dhabi", "uae"],               "photo-1512453979798-5ea266f8880c"],
  [["canada", "toronto", "vancouver"],          "photo-1534430480872-3498386e7856"],
  [["australia", "sydney", "melbourne"],        "photo-1523482580672-f109ba8cb9be"],
  [["iceland", "reykjavik"],                    "photo-1504893524553-b855bce32c67"],
  [["maldives"],                                "photo-1514282401047-d79a71a590e8"],
  [["peru", "machu picchu", "lima"],            "photo-1526392060635-9d6019884377"],
  [["mexico", "cancun", "oaxaca"],              "photo-1518638150340-f706e86654de"],
  [["india", "taj mahal", "delhi", "mumbai"],   "photo-1506905925346-21bda4d32df4"],
  [["turkey", "istanbul"],                      "photo-1524231757912-21f4fe3a7200"],
  [["patagonia", "chile", "argentina"],         "photo-1501854140801-50d01698950b"],
  [["new zealand"],                             "photo-1469521669194-babb45599def"],
];

const FALLBACK_PHOTO = "photo-1488646953014-85cb44e25828"; // generic travel/map

function getDestinationPhoto(dest: string): string {
  const lower = dest.toLowerCase();
  for (const [keywords, id] of DESTINATION_PHOTOS) {
    if (keywords.some((k) => lower.includes(k))) return id;
  }
  return FALLBACK_PHOTO;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: Record<string, any>) {
  return {
    id: row.id as string,
    destination: (row.destination as string) ?? "",
    isMultiCity: (row.is_multi_city as boolean) ?? false,
    cities: (row.cities as string[]) ?? [],
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    travelers: (row.travelers as number) ?? 1,
    budget: (row.budget as number) ?? 0,
    aiResult: (row.ai_result as string) ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cards: (row.cards as any[] | null) ?? null,
    savedAt: row.saved_at as string,
  };
}

async function getTrip(id: string) {
  const { data, error } = await supabaseAdmin
    .from("trips")
    .select("id, destination, is_multi_city, cities, start_date, end_date, travelers, budget, ai_result, cards, saved_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromRow(data);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Trip not found — Vagamundo" };

  const dest = trip.isMultiCity ? trip.cities.join(" → ") : trip.destination;
  const nights = trip.startDate && trip.endDate
    ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
    : null;
  const title = nights ? `${dest} · ${nights} nights — Vagamundo` : `${dest} — Vagamundo`;
  const description = `AI-planned trip to ${dest}${nights ? ` (${nights} nights)` : ""} for ${trip.travelers} ${trip.travelers === 1 ? "person" : "people"}. Budget €${trip.budget.toLocaleString()}/person. Planned with Vagamundo.`;
  const photoId = getDestinationPhoto(dest);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://vagamundo.io/trip/${id}`,
      siteName: "Vagamundo",
      type: "article",
      images: [{ url: `https://images.unsplash.com/${photoId}?w=1200&h=630&fit=crop&q=80`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://images.unsplash.com/${photoId}?w=1200&h=630&fit=crop&q=80`],
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const dest = trip.isMultiCity ? trip.cities.join(" → ") : trip.destination;
  const nights = trip.startDate && trip.endDate
    ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
    : null;
  const photoId = getDestinationPhoto(dest);
  const heroUrl = `https://images.unsplash.com/${photoId}?w=1600&q=80&auto=format&fit=crop`;

  // Top 3 cards with highlights
  const topCards = (trip.cards ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link href="/plan" className="hidden sm:block">
          <Button size="sm">Plan a trip</Button>
        </Link>
      </SiteNav>

      {/* Hero */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <Image
          src={heroUrl}
          alt={dest}
          fill
          priority
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 max-w-5xl mx-auto w-full">
          <Badge className="mb-2 bg-white/15 text-white border-white/20 backdrop-blur-sm text-xs">
            AI-planned trip
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-[-0.03em] text-white break-words">
            {dest}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/80">
            {trip.startDate && (
              <span>📅 {formatDate(trip.startDate)}{trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}{nights ? ` · ${nights} nights` : ""}</span>
            )}
            <span>👥 {trip.travelers} {trip.travelers === 1 ? "person" : "people"}</span>
            <span>💶 €{trip.budget.toLocaleString()} / person</span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

            {/* Left: AI Plan */}
            <div className="min-w-0">
              {trip.aiResult && (
                <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                    AI Travel Plan
                  </p>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{trip.aiResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sidebar */}
            <div className="lg:sticky lg:top-6 h-fit space-y-5">

              {/* Map */}
              <TripMap destination={dest} height={200} />

              {/* Trip Options */}
              {topCards.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Trip Options</p>
                  <div className="space-y-3">
                    {topCards.map((card, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 ${i === 0 ? "border-foreground bg-foreground/5" : "border-border"}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {card.destination ?? dest}
                            </p>
                            {card.tagline && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{card.tagline}</p>
                            )}
                          </div>
                          {card.price != null && (
                            <span className="text-sm font-bold text-foreground shrink-0">
                              €{Number(card.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {card.themes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(card.themes as string[]).slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                            ))}
                          </div>
                        )}
                        {card.bookingUrl && (
                          <a
                            href={card.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2.5 text-xs font-medium text-brand hover:underline"
                          >
                            View flights →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="bg-surface rounded-2xl border border-border p-5 text-center">
                <p className="text-sm font-extrabold text-foreground mb-1">Plan your own trip</p>
                <p className="text-xs text-muted-foreground mb-4">
                  8 AI agents plan everything in seconds.
                </p>
                <Link href="/plan" className="block">
                  <Button className="w-full">Start planning →</Button>
                </Link>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
