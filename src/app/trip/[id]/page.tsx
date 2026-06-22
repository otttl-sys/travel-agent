import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";

type Props = { params: Promise<{ id: string }> };

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://vagamundo.io/trip/${id}`,
      siteName: "Vagamundo",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link href="/plan"><Button size="sm">Plan your own trip</Button></Link>
      </SiteNav>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-14">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <Badge variant="secondary" className="mb-3 text-xs">AI-planned trip</Badge>
            <h1 className="text-3xl sm:text-headline font-extrabold tracking-[-0.03em] text-foreground break-words mb-3">
              {dest}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {trip.startDate && (
                <span>📅 {formatDate(trip.startDate)}{trip.endDate ? ` → ${formatDate(trip.endDate)}` : ""}{nights ? ` · ${nights} nights` : ""}</span>
              )}
              <span>👥 {trip.travelers} {trip.travelers === 1 ? "person" : "people"}</span>
              <span>💶 €{trip.budget.toLocaleString()} / person</span>
            </div>
          </div>

          {/* AI Plan */}
          {trip.aiResult && (
            <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">AI Travel Plan</p>
              <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{trip.aiResult}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Trip Options (cards) */}
          {trip.cards && trip.cards.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Trip Options</p>
              <div className="space-y-4">
                {trip.cards.map((card, i) => (
                  <div key={i} className="bg-surface rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{card.destination ?? dest}</h3>
                        {card.tagline && <p className="text-sm text-muted-foreground mt-0.5">{card.tagline}</p>}
                      </div>
                      {card.price != null && (
                        <span className="text-sm font-semibold text-foreground shrink-0">€{Number(card.price).toLocaleString()}</span>
                      )}
                    </div>
                    {card.themes && card.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {card.themes.map((theme: string) => (
                          <Badge key={theme} variant="secondary" className="text-xs">{theme}</Badge>
                        ))}
                      </div>
                    )}
                    {card.bookingUrl && (
                      <a
                        href={card.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-xs font-medium text-brand hover:underline"
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
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 text-center">
            <h2 className="text-lg font-extrabold text-foreground mb-2">Plan your own trip</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Let AI agents research and plan your perfect trip in seconds.
            </p>
            <Link href="/plan">
              <Button size="lg">Start planning →</Button>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
