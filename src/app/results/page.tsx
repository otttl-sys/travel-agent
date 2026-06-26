"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveTrip } from "@/lib/saved-trips";
import { SiteNav } from "@/components/site-nav";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";
import { SafetyPanel } from "@/components/safety-panel";

type Trip = {
  id: string;
  destination: string;
  tagline: string;
  description: string;
  price: number;
  duration: string;
  themes: string[];
  highlights: string[];
  gradient: string;
  emoji: string;
  itinerary: { day: string; activities: string[] }[];
  budget: { flights: number; hotel: number; activities: number; food: number };
  bookingUrl: string;
};

const MOCK_TRIPS: Trip[] = [
  {
    id: "japan",
    destination: "Japan",
    tagline: "Tradition trifft Moderne",
    description:
      "Von den Tempeln Kyotos bis zur Skyline Tokyos — eine unvergessliche Reise durch zwei Welten.",
    price: 2890,
    duration: "14 Tage",
    themes: ["Kultur", "Kulinarik", "Natur"],
    highlights: ["Shinkansen-Erlebnis", "Ryokan in Kyoto", "Fuji-Besteigung", "Tokio Streetfood Tour"],
    gradient: "from-rose-400 to-orange-300",
    emoji: "🗾",
    itinerary: [
      { day: "Tag 1–3", activities: ["Ankunft Tokio", "Shibuya & Harajuku", "Teamlab Borderless Museum"] },
      { day: "Tag 4–6", activities: ["Shinkansen nach Kyoto", "Fushimi Inari Schrein", "Bambushain Arashiyama"] },
      { day: "Tag 7–9", activities: ["Nara Tagesausflug", "Nishiki-Markt", "Goldener Pavillon Kinkaku-ji"] },
      { day: "Tag 10–12", activities: ["Fuji-Region", "Hakone Onsen", "Ryokan-Nacht"] },
      { day: "Tag 13–14", activities: ["Rückflug Tokio", "Last-Minute Akihabara & Souvenir"] },
    ],
    budget: { flights: 1010, hotel: 1010, activities: 435, food: 290 },
    bookingUrl: "https://www.google.com/flights?q=flights+to+tokyo",
  },
  {
    id: "portugal",
    destination: "Portugal",
    tagline: "Atlantikflair & Pastéis de Nata",
    description:
      "Lissabon, Algarve-Küste und der grüne Norden — entspannt, günstig, unvergesslich schön.",
    price: 1290,
    duration: "10 Tage",
    themes: ["Strand", "Städtetrip", "Kulinarik"],
    highlights: ["Lissabon Altstadt", "Algarve Klippenküste", "Portwein-Tour", "Cascais Tagesausflug"],
    gradient: "from-emerald-400 to-teal-300",
    emoji: "🇵🇹",
    itinerary: [
      { day: "Tag 1–3", activities: ["Ankunft Lissabon", "Alfama & Belém", "Pastéis de Nata Pflichtprogramm"] },
      { day: "Tag 4–5", activities: ["Tagesausflug Sintra", "Cascais Strandpromenade"] },
      { day: "Tag 6–8", activities: ["Fahrt Algarve", "Praia da Marinha", "Ponta da Piedade Bootsfahrt"] },
      { day: "Tag 9–10", activities: ["Porto Tagesausflug", "Portwein-Keller", "Rückflug"] },
    ],
    budget: { flights: 450, hotel: 450, activities: 195, food: 130 },
    bookingUrl: "https://www.google.com/flights?q=flights+to+lisbon",
  },
  {
    id: "costarica",
    destination: "Costa Rica",
    tagline: "Pura Vida & Regenwald",
    description:
      "Vulkane, Regenwald, Surfen und Faultiere — Abenteuer pur in einem der artenreichsten Länder der Welt.",
    price: 2190,
    duration: "12 Tage",
    themes: ["Abenteuer", "Natur", "Strand"],
    highlights: ["Arenal Vulkan", "Monteverde Regenwald", "Manuel Antonio Strand", "Weißwasser-Rafting"],
    gradient: "from-green-500 to-lime-400",
    emoji: "🌴",
    itinerary: [
      { day: "Tag 1–2", activities: ["Ankunft San José", "Transfer Arenal", "Vulkan-Wanderung"] },
      { day: "Tag 3–4", activities: ["La Fortuna Wasserfall", "Heiße Quellen", "Zip-lining"] },
      { day: "Tag 5–7", activities: ["Monteverde Nebelwald", "Hängebrücken", "Quetzal-Vogelbeobachtung"] },
      { day: "Tag 8–10", activities: ["Manuel Antonio Nationalpark", "Surfstunden", "Strandtage"] },
      { day: "Tag 11–12", activities: ["Weißwasser-Rafting Río Pacuare", "Rückflug San José"] },
    ],
    budget: { flights: 765, hotel: 765, activities: 330, food: 220 },
    bookingUrl: "https://www.google.com/flights?q=flights+to+san+jose+costa+rica",
  },
];

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">🤖</div>
            <p className="text-muted-foreground">Agenten starten…</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [showTrace, setShowTrace] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolCounts, setToolCounts] = useState({ search_flights: 0, search_hotels: 0, get_activities: 0, optimize_budget: 0, search_flight_leg: 0, plan_city_stop: 0, optimize_total_budget: 0 });
  const [dynamicCards, setDynamicCards] = useState<Trip[] | null>(null);
  const [flightsData, setFlightsData] = useState<{ priceRange: string; originCode: string; destCode: string } | null>(null);
  const [hotelsData, setHotelsData] = useState<{ priceRange: string; destination: string; nights: number } | null>(null);
  const [activitiesData, setActivitiesData] = useState<{ count: number; priceRange: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refinementCount, setRefinementCount] = useState(0);
  const [streamingDone, setStreamingDone] = useState(false);
  const hasFetchedRef = useRef(false);
  const loadingRef = useRef(true);
  const [loadingInterrupted, setLoadingInterrupted] = useState(false);

  const destination = searchParams.get("destination") || "";
  const budget = Number(searchParams.get("budget") || 3000);

  async function handleSave() {
    const id = await saveTrip({
      destination: isMultiCity ? cityNames.join(", ") : destination,
      isMultiCity,
      cities: cityNames,
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      travelers: Number(searchParams.get("travelers") || 2),
      budget,
      aiResult: aiResult || "",
      cards: dynamicCards,
    });
    setSaved(true);
    setSavedId(id);
  }

  async function handleCopyShareLink() {
    if (!savedId) return;
    const url = `${window.location.origin}/trip/${savedId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  // Keep loadingRef in sync with state for the visibility-change handler
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Fix: detect when user switches apps during streaming and returns to a broken state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && loadingRef.current) {
        setLoadingInterrupted(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const isMultiCity = searchParams.get("multiCity") === "1";
  const citiesParam = searchParams.get("cities") || "";
  const cityDaysParam = searchParams.get("cityDays") || "";
  const cityNames = isMultiCity ? citiesParam.split(",").filter(Boolean) : [];
  const cityDaysArr = isMultiCity ? cityDaysParam.split(",").map(Number) : [];

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    const controller = new AbortController();

    const params = isMultiCity
      ? {
          multiCity: "1",
          cities: citiesParam,
          cityDays: cityDaysParam,
          startDate: searchParams.get("startDate") || "",
          travelers: searchParams.get("travelers") || "2",
          interests: searchParams.get("interests") || "",
          budget,
        }
      : {
          destination,
          startDate: searchParams.get("startDate") || "",
          endDate: searchParams.get("endDate") || "",
          travelers: searchParams.get("travelers") || "2",
          interests: searchParams.get("interests") || "",
          budget,
        };

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.5, 90));
    }, 200);

    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    }).then(async (res) => {
      clearInterval(progressInterval);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let agentsStarted = false;

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;

          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; text?: string; message?: string; cards?: Trip[] };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (parsed.type === "error") {
            setError(parsed.message ?? "AI-Fehler. Bitte versuche es erneut.");
            setLoading(false);
            break;
          }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool) {
            agentsStarted = true;
            setTrace((prev) => [
              ...prev,
              { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" },
            ]);
            const tool = parsed.tool as keyof typeof toolCounts;
            if (tool in toolCounts) {
              setToolCounts((prev) => ({ ...prev, [tool]: prev[tool] + 1 }));
            }
          }
          if (parsed.type === "tool_done" && parsed.id) {
            setTrace((prev) => prev.map((entry) => (entry.id === parsed.id ? { ...entry, status: "done" } : entry)));
          }
          if (parsed.type === "token") {
            // Streaming token — show result panel immediately, append tokens live
            result += parsed.text ?? "";
            setAiResult(result);
            // Wait until the agents have actually started before leaving the loading
            // screen — otherwise a short intro sentence Claude streams before calling
            // its tools would flip us to results before the live trace ever appears.
            if (loading && agentsStarted) {
              setProgress(100);
              setLoading(false);
            }
          }
          if (parsed.type === "result") {
            result = parsed.text ?? "";
          }
          if (parsed.type === "cards") {
            setDynamicCards(parsed.cards as Trip[]);
          }
          if (parsed.type === "flights") {
            const f = parsed as unknown as { priceRange: string; originCode: string; destCode: string };
            setFlightsData({ priceRange: f.priceRange, originCode: f.originCode, destCode: f.destCode });
          }
          if (parsed.type === "hotels") {
            const h = parsed as unknown as { priceRange: string; destination: string; nights: number };
            setHotelsData({ priceRange: h.priceRange, destination: h.destination, nights: h.nights });
          }
          if (parsed.type === "activities") {
            const a = parsed as unknown as { count: number; priceRange: string };
            setActivitiesData({ count: a.count, priceRange: a.priceRange });
          }
        }
      }

      setProgress(100);
      setTimeout(() => {
        setAiResult(result);
        setLoading(false);
        setStreamingDone(true);
      }, 500);
    }).catch((err) => {
      if (err.name === "AbortError") return;
      clearInterval(progressInterval);
      setError("Verbindungsfehler. Bitte versuche es erneut.");
      setLoading(false);
    });

    return () => {
      controller.abort();
      clearInterval(progressInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (streamingDone) {
      setTimeout(() => {
        document.getElementById("budget-tracker")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
    }
  }, [streamingDone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg text-center">
          {loadingInterrupted ? (
            <>
              <div className="text-5xl mb-6">📵</div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Verbindung unterbrochen</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Die Suche wurde pausiert als du die App verlassen hast. Bitte neu starten.
              </p>
              <Button onClick={() => window.location.reload()} className="px-8">
                Neu starten →
              </Button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-6 animate-pulse">🧭</div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">AI analysiert deine Reise</h2>
              <p className="text-muted-foreground text-sm mb-8">
                {destination ? `Wir suchen die besten Optionen für ${destination}.` : "Mehrere Agenten arbeiten für dich."}
              </p>
              <div className="space-y-2 mb-8">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground tabular-nums">{Math.round(progress)}%</p>
              </div>
              <div className="text-left">
                {trace.length > 0 ? (
                  <AgentTrace trace={trace} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center animate-pulse">Orchestrator Agent startet…</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Etwas ist schiefgelaufen</h2>
          <p className="text-muted-foreground text-sm mb-8">{error}</p>
          <Button onClick={() => window.location.reload()}>Nochmal versuchen</Button>
        </div>
      </div>
    );
  }

  const displayTrips = dynamicCards ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <SiteNav noPrint>
        <Link href="/saved" className="text-sm text-muted-foreground hidden sm:block hover:text-foreground transition-colors mr-2">
          Saved Trips
        </Link>
        <Link href="/packing" className="text-sm text-muted-foreground hidden sm:block hover:text-foreground transition-colors mr-2">
          Packing List
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams();
            if (destination) params.set("destination", destination);
            const sd = searchParams.get("startDate"); if (sd) params.set("startDate", sd);
            const ed = searchParams.get("endDate"); if (ed) params.set("endDate", ed);
            const tr = searchParams.get("travelers"); if (tr) params.set("travelers", tr);
            const int = searchParams.get("interests"); if (int) params.set("interests", int);
            params.set("budget", String(budget));
            router.push(`/plan?${params.toString()}`);
          }}
        >
          ✏️ Edit Search
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/plan")} className="ml-1">
          + New
        </Button>
      </SiteNav>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <Badge variant="secondary" className="text-xs">
                {isMultiCity
                ? `Multi-City Tour · ${cityNames.length} Stationen`
                : searchParams.get("adventure") === "1"
                  ? "⚡ Adventure Mode · 5 off-beat options"
                  : searchParams.get("interests")?.split(",").includes("family")
                    ? "🎡 Family Mode · 5 kid-friendly options"
                    : dynamicCards
                      ? `AI created ${dynamicCards.length} trip options for you`
                      : "AI is creating your personalised trip options"}
              </Badge>
              {aiResult && (
                <div className="flex items-center gap-2 no-print">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={saved}
                    className={saved ? "text-green-600 border-green-200 bg-green-50" : ""}
                  >
                    {saved ? "✓ Saved" : "Save Trip"}
                  </Button>
                  {savedId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyShareLink}
                      className={copied ? "text-green-600 border-green-200 bg-green-50" : ""}
                    >
                      {copied ? "✓ Copied!" : "Share Link"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    PDF
                  </Button>
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-headline font-extrabold tracking-[-0.03em] text-foreground break-words">
              {isMultiCity
                ? cityNames.join(" → ")
                : destination ? `Your trip to ${destination}` : "Your trip options"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {searchParams.get("travelers") || "2"} Personen ·{" "}
              {searchParams.get("startDate") || "Flexibles Datum"} ·{" "}
              Budget €{budget.toLocaleString()} pro Person
              {isMultiCity && ` · ${cityDaysArr.reduce((s, d) => s + d, 0)} Tage gesamt`}
            </p>
            {(flightsData || hotelsData || activitiesData) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {flightsData && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 text-xs font-semibold text-sky-700 dark:text-sky-400">
                    <span>✈️</span>
                    <span>{flightsData.originCode} → {flightsData.destCode} · {flightsData.priceRange}</span>
                    <span className="opacity-60 font-normal">live</span>
                  </div>
                )}
                {hotelsData && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>🏨</span>
                    <span>{hotelsData.priceRange} · {hotelsData.nights} nights</span>
                    <span className="opacity-60 font-normal">live</span>
                  </div>
                )}
                {activitiesData && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 text-xs font-semibold text-violet-700 dark:text-violet-400">
                    <span>🎯</span>
                    <span>{activitiesData.count} activities · {activitiesData.priceRange}</span>
                    <span className="opacity-60 font-normal">live</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Multi-City Route Visual */}
          {isMultiCity && (
            <div className="bg-surface rounded-2xl border border-border p-6 mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Deine Route</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {cityNames.map((city, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-brand text-brand-foreground text-sm font-bold flex items-center justify-center mx-auto mb-1">
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{city}</p>
                      <p className="text-xs text-muted-foreground">{cityDaysArr[i] ?? 3} Tage</p>
                    </div>
                    {i < cityNames.length - 1 && (
                      <span className="text-muted-foreground/40 text-xl mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trip Cards mobile: horizontal scroll (sidebar handles desktop) */}
          {!isMultiCity && displayTrips.length > 0 && (
            <div className="md:hidden flex gap-4 overflow-x-auto pb-2 mb-8 -mx-2 px-2">
              {displayTrips.map((trip, index) => (
                <div key={trip.id} className="w-64 shrink-0">
                  <TripCard trip={trip} featured={index === 0} compact />
                </div>
              ))}
            </div>
          )}

          {/* Two-column layout: main content + sidebar */}
          <div className={!isMultiCity && displayTrips.length > 0 ? "flex flex-col lg:flex-row gap-8 items-start" : ""}>
            <div className="flex-1 min-w-0">
              {/* AI Result */}
              {aiResult && (
                <div className="bg-surface rounded-2xl border border-border p-4 sm:p-8 mb-4 sm:mb-6" style={{ overflowAnchor: "none" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-xl">🧭</span>
                    <h3 className="font-semibold text-foreground">Your personalised travel plan by Vagamundo</h3>
                    {refinementCount > 0 && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        ✨ Refined ×{refinementCount}
                      </Badge>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Conversational refinement */}
              {aiResult && (
                <RefinementChat
                  currentPlan={aiResult}
                  destination={isMultiCity ? cityNames.join(", ") : destination}
                  budget={budget}
                  startDate={searchParams.get("startDate") || ""}
                  endDate={searchParams.get("endDate") || ""}
                  travelers={searchParams.get("travelers") || "2"}
                  interests={searchParams.get("interests") || ""}
                  onPlanUpdate={(newPlan) => {
                    setAiResult(newPlan);
                    setRefinementCount((n) => n + 1);
                  }}
                />
              )}

              {/* Safety & Weather */}
              {!isMultiCity && destination && (
                <div className="mb-4 sm:mb-6">
                  <SafetyPanel
                    destination={destination}
                    startDate={searchParams.get("startDate") || undefined}
                    endDate={searchParams.get("endDate") || undefined}
                  />
                </div>
              )}

              {/* Booking Links */}
              <BookingSection
                destination={destination}
                startDate={searchParams.get("startDate") || ""}
                endDate={searchParams.get("endDate") || ""}
                travelers={searchParams.get("travelers") || "2"}
              />

              {/* Budget Tracker */}
              <BudgetTracker budget={budget} aiResult={aiResult} isMultiCity={isMultiCity} travelers={Number(searchParams.get("travelers") || 2)} />

              {/* Agent Summary */}
              <div className="bg-surface rounded-2xl border border-border p-4 sm:p-6 no-print">
                <h3 className="font-semibold text-foreground mb-4">What the agents analysed</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(isMultiCity ? [
                    { icon: "✈️", label: "Flug-Legs", value: toolCounts.search_flight_leg > 0 ? `${toolCounts.search_flight_leg}` : "—" },
                    { icon: "🏨", label: "Städte geplant", value: toolCounts.plan_city_stop > 0 ? `${toolCounts.plan_city_stop}` : "—" },
                    { icon: "🗺️", label: "Stationen", value: cityNames.length > 0 ? `${cityNames.length}` : "—" },
                    { icon: "💰", label: "Budget optimiert", value: toolCounts.optimize_total_budget > 0 ? "✓" : "—" },
                  ] : [
                    { icon: "✈️", label: "Flug-Ergebnisse", value: toolCounts.search_flights > 0 ? `${toolCounts.search_flights * 5}` : "—" },
                    { icon: "🏨", label: "Hotel-Ergebnisse", value: toolCounts.search_hotels > 0 ? `${toolCounts.search_hotels * 5}` : "—" },
                    { icon: "🗺️", label: "Aktivitäten", value: toolCounts.get_activities > 0 ? `${toolCounts.get_activities * 5}` : "—" },
                    { icon: "💰", label: "Budget optimiert", value: toolCounts.optimize_budget > 0 ? "✓" : "—" },
                  ]).map((item) => (
                    <div key={item.label} className="text-center p-4 rounded-xl bg-brand-subtle">
                      <span className="text-2xl block mb-2">{item.icon}</span>
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                {trace.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <button
                      onClick={() => setShowTrace((v) => !v)}
                      className="text-sm font-medium text-brand hover:text-brand/80 flex items-center gap-1.5"
                    >
                      {showTrace ? "Agent-Protokoll ausblenden" : "Agent-Protokoll anzeigen"}
                      <span className={`transition-transform ${showTrace ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {showTrace && (
                      <div className="mt-4">
                        <AgentTrace trace={trace} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: Trip Cards (desktop only) */}
            {!isMultiCity && displayTrips.length > 0 && (
              <div className="w-72 lg:w-80 shrink-0 hidden md:block">
                <div className="sticky top-8 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Trip options ({displayTrips.length})</p>
                  {displayTrips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} featured={index === 0} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const REFINEMENT_CHIPS = [
  { label: "Make it cheaper 💰", prompt: "Make this trip cheaper. Find budget-friendly alternatives for flights, hotels, and activities while keeping the same destination and duration." },
  { label: "More culture 🏛️", prompt: "Add more cultural depth: include museums, historical sites, local festivals, traditional food markets, and authentic neighborhood experiences." },
  { label: "More adventure ⚡", prompt: "Make it more adventurous with outdoor activities, hiking, and off-the-beaten-path experiences. Include at least one physical challenge." },
  { label: "Better beaches 🏖️", prompt: "Emphasize beach and coastal experiences. Prioritize seaside stays, water activities, and scenic coastal routes." },
  { label: "Family-friendly 👨‍👩‍👧", prompt: "Adapt for families with children: add kid-friendly activities, shorter activity blocks, family hotels, child discounts, and safe neighbourhoods." },
  { label: "Luxury upgrade ✨", prompt: "Upgrade to a luxury experience: 5-star hotels, Michelin-starred dining, private tours, and premium activities." },
];

function VoiceButton({ onTranscript, disabled }: { onTranscript: (t: string) => void; disabled: boolean }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    type SRCtor = new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void; stop: () => void;
    };
    const win = window as unknown as Record<string, unknown>;
    const SR = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as SRCtor | undefined;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "de-DE";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => onTranscript(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); };
    rec.start();
    setListening(true);
    recRef.current = rec;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop recording" : "Voice input"}
      className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-40 ${
        listening
          ? "bg-red-500 border-red-400 text-white animate-pulse"
          : "border-border bg-background text-muted-foreground hover:border-brand hover:text-brand"
      }`}
    >
      {listening ? "⏹" : "🎤"}
    </button>
  );
}

function RefinementChat({
  currentPlan,
  destination,
  budget,
  startDate,
  endDate,
  travelers,
  interests,
  onPlanUpdate,
}: {
  currentPlan: string;
  destination: string;
  budget: number;
  startDate: string;
  endDate: string;
  travelers: string;
  interests: string;
  onPlanUpdate: (plan: string) => void;
}) {
  const [input, setInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");
  const [lastMessage, setLastMessage] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  async function submit(message: string) {
    if (!message.trim() || isRefining) return;
    setIsRefining(true);
    setStreamPreview("");
    setLastMessage(message);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          currentPlan,
          destination,
          budget,
          startDate,
          endDate,
          travelers,
          interests,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          let parsed: { type: string; text?: string; message?: string };
          try { parsed = JSON.parse(line.replace("data: ", "")); } catch { continue; }
          if (parsed.type === "token") {
            fullText += parsed.text ?? "";
            setStreamPreview(fullText.slice(0, 160));
          }
          if (parsed.type === "result") fullText = parsed.text ?? fullText;
          if (parsed.type === "error") throw new Error(parsed.message);
        }
      }

      onPlanUpdate(fullText);
      setHistory((prev) => [...prev, message]);
    } catch {
      // silently swallow — parent plan unchanged
    } finally {
      setIsRefining(false);
      setStreamPreview("");
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="bg-gradient-to-br from-surface to-brand-subtle/30 rounded-2xl border border-brand/40 p-4 sm:p-6 mb-4 sm:mb-6 no-print shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🤖</span>
        <h3 className="font-bold text-foreground text-base">Chat with Claude</h3>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full">AI</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Ask to change anything — Claude knows your full trip plan and budget.</p>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {REFINEMENT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => submit(chip.prompt)}
            disabled={isRefining}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-brand-subtle hover:border-brand/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Free-text input with auto-expand + voice */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          spellCheck
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
          placeholder='z.B. "Füge einen Tagesausflug hinzu" oder "Günstiger bitte"'
          disabled={isRefining}
          className="flex-1 text-sm rounded-xl border border-border bg-background px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 resize-none overflow-hidden min-h-[42px]"
          style={{ lineHeight: "1.5" }}
        />
        <VoiceButton
          onTranscript={(t) => { setInput((prev) => prev + (prev ? " " : "") + t); setTimeout(autoResize, 0); }}
          disabled={isRefining}
        />
        <Button
          onClick={() => submit(input)}
          disabled={isRefining || !input.trim()}
          size="sm"
          className="px-4 shrink-0 h-[42px]"
        >
          {isRefining ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
            </span>
          ) : "→"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">Enter senden · Shift+Enter Zeilenumbruch · 🎤 Spracheingabe</p>

      {/* Streaming indicator */}
      {isRefining && (
        <div className="mt-3 p-3 rounded-xl bg-brand-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-xs font-medium text-brand">Refining: "{lastMessage.slice(0, 60)}{lastMessage.length > 60 ? "…" : ""}"</span>
          </div>
          <div className="w-full bg-brand/15 rounded-full h-1.5 mb-2 overflow-hidden">
            <div className="h-1.5 rounded-full bg-brand animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
          {streamPreview && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{streamPreview}…</p>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
          {history.slice(-4).map((msg, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-brand-subtle text-muted-foreground">
              ✓ {msg.length > 50 ? msg.slice(0, 50) + "…" : msg}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const BUDGET_CATEGORIES = [
  { key: "flights",    label: "Flüge",        icon: "✈️",  pct: 0.35 },
  { key: "hotel",      label: "Unterkunft",   icon: "🏨",  pct: 0.35 },
  { key: "activities", label: "Aktivitäten",  icon: "🗺️",  pct: 0.15 },
  { key: "food",       label: "Essen",        icon: "🍽️",  pct: 0.10 },
  { key: "transport",  label: "Transport",    icon: "🚌",  pct: 0.05 },
];

function extractBudgetFromAI(aiResult: string | null, budget: number): Record<string, number> {
  if (!aiResult) {
    return Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, Math.round(budget * c.pct)]));
  }
  const result: Record<string, number> = {};
  for (const cat of BUDGET_CATEGORIES) {
    // Look for e.g. "€1.234" or "€1234" near the category label in the AI text
    const patterns = [
      new RegExp(`${cat.label}[^\\n]{0,80}€([\\d.,]+)`, "i"),
      new RegExp(`€([\\d.,]+)[^\\n]{0,40}${cat.label}`, "i"),
    ];
    let found = false;
    for (const re of patterns) {
      const m = aiResult.match(re);
      if (m) {
        const val = Number(m[1].replace(/\./g, "").replace(",", "."));
        if (val > 0 && val < budget * 3) { result[cat.key] = Math.round(val); found = true; break; }
      }
    }
    if (!found) result[cat.key] = Math.round(budget * cat.pct);
  }
  return result;
}

function BudgetTracker({ budget: initialBudget, aiResult, isMultiCity, travelers }: {
  budget: number;
  aiResult: string | null;
  isMultiCity: boolean;
  travelers: number;
}) {
  const [totalBudget, setTotalBudget] = useState(initialBudget);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInputVal, setTotalInputVal] = useState(String(initialBudget));

  const initial = extractBudgetFromAI(aiResult, totalBudget);
  const [items, setItems] = useState<Record<string, number>>(initial);

  useEffect(() => {
    if (aiResult) setItems(extractBudgetFromAI(aiResult, totalBudget));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiResult]);

  const total = Object.values(items).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - total;
  const pct = Math.min((total / totalBudget) * 100, 100);
  const over = total > totalBudget;

  function updateSlider(key: string, val: number) {
    setItems((prev) => ({ ...prev, [key]: val }));
  }

  function commitTotalEdit() {
    const n = parseInt(totalInputVal.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) setTotalBudget(n);
    else setTotalInputVal(String(totalBudget));
    setEditingTotal(false);
  }

  return (
    <div id="budget-tracker" className="bg-surface rounded-2xl border border-border p-4 sm:p-8 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">💶</span>
          <h3 className="font-semibold text-foreground">Budget Tracker</h3>
          <span className="text-xs text-muted-foreground ml-1">per person · drag sliders to adjust</span>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${over ? "text-red-600" : "text-green-600"}`}>
            {over ? `−€${Math.abs(remaining).toLocaleString()} over budget` : `€${remaining.toLocaleString()} remaining`}
          </p>
          {/* Editable total budget */}
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-xs text-muted-foreground">Budget:</span>
            {editingTotal ? (
              <input
                autoFocus
                type="number"
                value={totalInputVal}
                onChange={(e) => setTotalInputVal(e.target.value)}
                onBlur={commitTotalEdit}
                onKeyDown={(e) => { if (e.key === "Enter") commitTotalEdit(); if (e.key === "Escape") setEditingTotal(false); }}
                className="w-24 text-right text-xs font-semibold border border-brand/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand/40"
              />
            ) : (
              <button
                onClick={() => { setEditingTotal(true); setTotalInputVal(String(totalBudget)); }}
                className="text-xs font-semibold text-muted-foreground hover:text-brand underline underline-offset-2 transition-colors"
              >
                €{totalBudget.toLocaleString()}
              </button>
            )}
            <span className="text-xs text-muted-foreground">/ person</span>
          </div>
        </div>
      </div>

      {/* Overview progress bar */}
      <div className="w-full bg-border rounded-full h-2 mb-6 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${over ? "bg-red-500" : pct > 85 ? "bg-amber-400" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Sliders */}
      <div className="space-y-4 mb-6">
        {BUDGET_CATEGORIES.map((cat) => {
          const sliderPct = Math.min(Math.round((items[cat.key] / totalBudget) * 100), 100);
          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base w-6">{cat.icon}</span>
                <span className="text-sm text-muted-foreground flex-1">{cat.label}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">€{items[cat.key].toLocaleString()}</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{sliderPct}%</span>
              </div>
              <div className="pl-8">
                <input
                  type="range"
                  min={0}
                  max={totalBudget}
                  step={10}
                  value={items[cat.key]}
                  onChange={(e) => updateSlider(cat.key, Number(e.target.value))}
                  className="w-full accent-brand h-1.5 cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className={`flex items-center justify-between pt-4 border-t ${over ? "border-red-100" : "border-border"} px-1 py-2`}>
        <span className="text-sm font-semibold text-foreground">Total per person</span>
        <span className={`text-lg font-bold ${over ? "text-red-600" : "text-foreground"}`}>
          €{total.toLocaleString()}
        </span>
      </div>
      {travelers > 1 && (
        <p className="text-xs text-muted-foreground text-right mt-1">
          {travelers} persons total: €{(total * travelers).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function BookingSection({
  destination,
  startDate,
  endDate,
  travelers,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: string;
}) {
  const dest = encodeURIComponent(destination || "Europe");
  const destRaw = destination || "Europe";
  const [expanded, setExpanded] = useState<string | null>(null);

  const links = [
    {
      icon: "🛫",
      label: "Flights",
      sub: "Google Flights",
      description: "Google's global flight search — compare airlines, see price calendars, set fare alerts.",
      tip: `Searching: ${destRaw} · ${startDate || "flexible dates"} · ${travelers} passenger${Number(travelers) > 1 ? "s" : ""}`,
      url: startDate && endDate
        ? `https://www.google.com/travel/flights#flt=${dest}.${startDate}.${dest}*${dest}.${endDate}.${dest};c:EUR;e:1;px:${travelers};tt:o`
        : `https://www.google.com/travel/flights?q=flights+to+${dest}`,
      cardClass: "border-blue-100 dark:border-blue-900/40",
      accentClass: "bg-blue-50 dark:bg-blue-950/30",
      labelClass: "text-blue-700 dark:text-blue-400",
    },
    {
      icon: "✈️",
      label: "Flights",
      sub: "Skyscanner",
      description: "Skyscanner aggregates hundreds of airlines and OTAs. Great for finding cheapest month / flexible dates.",
      tip: "Best for: flexible date search & budget airlines",
      url: `https://www.skyscanner.de/transport/flights/anywhere/${dest.toLowerCase()}/${startDate ? startDate.replace(/-/g, "") : ""}/?adults=${travelers}&currency=EUR`,
      cardClass: "border-sky-100 dark:border-sky-900/40",
      accentClass: "bg-sky-50 dark:bg-sky-950/30",
      labelClass: "text-sky-700 dark:text-sky-400",
    },
    {
      icon: "🔍",
      label: "Flights",
      sub: "Kayak",
      description: "Kayak searches 200+ travel sites at once. Price alerts and flexible destination search.",
      tip: "Best for: price alerts & last-minute deals",
      url: `https://www.kayak.de/flights/FRA-${dest}/${startDate || ""}/${endDate || ""}/${travelers}adults`,
      cardClass: "border-orange-100 dark:border-orange-900/40",
      accentClass: "bg-orange-50 dark:bg-orange-950/30",
      labelClass: "text-orange-700 dark:text-orange-400",
    },
    {
      icon: "🏕️",
      label: "Hotels",
      sub: "Booking.com",
      description: "World's largest hotel platform. 28M+ listings, free cancellation options, genius loyalty tier.",
      tip: startDate && endDate ? `${destRaw} · ${startDate} → ${endDate} · ${travelers} guest${Number(travelers) > 1 ? "s" : ""}` : `Searching hotels in ${destRaw}`,
      url: `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${startDate || ""}&checkout=${endDate || ""}&group_adults=${travelers}&no_rooms=1&lang=en&currency=EUR`,
      cardClass: "border-amber-100 dark:border-amber-900/40",
      accentClass: "bg-amber-50 dark:bg-amber-950/30",
      labelClass: "text-amber-700 dark:text-amber-400",
    },
    {
      icon: "🏡",
      label: "Apartments",
      sub: "Airbnb",
      description: "Homes, apartments & unique stays. Great for longer trips, families, and local neighbourhood immersion.",
      tip: `${destRaw} · entire homes & private rooms`,
      url: `https://www.airbnb.com/s/${encodeURIComponent(destRaw)}/homes?checkin=${startDate || ""}&checkout=${endDate || ""}&adults=${travelers}&currency=EUR`,
      cardClass: "border-rose-100 dark:border-rose-900/40",
      accentClass: "bg-rose-50 dark:bg-rose-950/30",
      labelClass: "text-rose-700 dark:text-rose-400",
    },
    {
      icon: "🧭",
      label: "Activities",
      sub: "GetYourGuide",
      description: "50,000+ guided tours, day trips and experiences worldwide. Instant confirmation, free cancellation.",
      tip: `Tours & activities in ${destRaw}`,
      url: `https://www.getyourguide.com/s/?q=${dest}${startDate ? `&date_from=${startDate}` : ""}`,
      cardClass: "border-green-100 dark:border-green-900/40",
      accentClass: "bg-green-50 dark:bg-green-950/30",
      labelClass: "text-green-700 dark:text-green-400",
    },
    {
      icon: "🌟",
      label: "Activities",
      sub: "Viator",
      description: "TripAdvisor's booking platform. 300,000+ experiences with verified reviews and best-price guarantee.",
      tip: `Experiences & tours in ${destRaw}`,
      url: `https://www.viator.com/searchResults/all?text=${dest}&startDate=${startDate || ""}`,
      cardClass: "border-violet-100 dark:border-violet-900/40",
      accentClass: "bg-violet-50 dark:bg-violet-950/30",
      labelClass: "text-violet-700 dark:text-violet-400",
    },
    {
      icon: "🎫",
      label: "Attractions",
      sub: "Klook",
      description: "Asia-focused activities & passes. Strong for Japan, Korea, SE Asia — city passes, airport transfers.",
      tip: `City passes & local experiences in ${destRaw}`,
      url: `https://www.klook.com/en-GB/search/?query=${dest}`,
      cardClass: "border-pink-100 dark:border-pink-900/40",
      accentClass: "bg-pink-50 dark:bg-pink-950/30",
      labelClass: "text-pink-700 dark:text-pink-400",
    },
  ];

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 sm:p-8 mb-4 sm:mb-6 no-print">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🔗</span>
        <h3 className="font-semibold text-foreground">Book direct</h3>
        <span className="text-xs text-muted-foreground ml-1">— tap to expand, then open in app</span>
      </div>
      <p className="text-xs text-muted-foreground mb-5">Click any provider to see details. "Open" takes you directly to pre-filled results.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {links.map((link) => {
          const isOpen = expanded === link.sub;
          return (
            <div key={link.sub} className={`rounded-xl border ${link.cardClass} overflow-hidden transition-all`}>
              <button
                onClick={() => setExpanded(isOpen ? null : link.sub)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className="text-xl">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold uppercase tracking-wide ${link.labelClass}`}>{link.label}</span>
                    <span className="text-xs text-muted-foreground">· {link.sub}</span>
                  </div>
                  {!isOpen && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{link.tip}</p>}
                </div>
                <span className={`text-muted-foreground/50 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {isOpen && (
                <div className={`px-3 pb-3 ${link.accentClass}`}>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{link.description}</p>
                  <p className="text-xs font-medium text-foreground/70 mb-3">📍 {link.tip}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold ${link.labelClass} border ${link.cardClass} bg-background hover:bg-surface transition-colors`}
                  >
                    Open {link.sub} ↗
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: { match: RegExp; icon: string }[] = [
  { match: /ankunft|abflug|rückflug|flughafen|transfer/i, icon: "✈️" },
  { match: /shinkansen|zug|bahn|fähre|boot|rafting|bootsfahrt/i, icon: "🚄" },
  { match: /hotel|ryokan|check-in|übernachtung|onsen/i, icon: "🛏️" },
  { match: /tempel|schrein|pavillon|kloster|burg|palast/i, icon: "⛩️" },
  { match: /museum|galerie|ausstellung/i, icon: "🏛️" },
  { match: /strand|küste|beach|surfen|insel/i, icon: "🏖️" },
  { match: /berg|vulkan|wanderung|hängebrücke|nationalpark|wald|regenwald/i, icon: "🥾" },
  { match: /markt|streetfood|restaurant|kulinarik|wein|tour|verkostung|nata/i, icon: "🍽️" },
  { match: /shopping|souvenir|akihabara/i, icon: "🛍️" },
  { match: /tagesausflug|sightseeing|altstadt|city/i, icon: "🗺️" },
];

function activityIcon(activity: string): string {
  const found = ACTIVITY_ICONS.find((a) => a.match.test(activity));
  return found?.icon ?? "📍";
}

function ItineraryTimeline({ itinerary }: { itinerary: { day: string; activities: string[] }[] }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggleBlock(i: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const allCollapsed = collapsed.size === itinerary.length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(itinerary.map((_, i) => i)))}
        className="text-xs text-muted-foreground hover:text-foreground mb-3 ml-9 transition-colors"
      >
        {allCollapsed ? "▸ Expand all" : "▾ Collapse all"}
      </button>
      <ol className="relative pl-9">
        <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-brand/40 via-brand/20 to-brand/10" aria-hidden />
        {itinerary.map((block, i) => {
          const isCollapsed = collapsed.has(i);
          return (
            <li key={block.day} className="relative pb-5 last:pb-0">
              <span className="absolute -left-9 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground ring-4 ring-surface">
                {i + 1}
              </span>
              <button
                onClick={() => toggleBlock(i)}
                className="flex items-center gap-2 mb-2 group w-full text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand group-hover:text-brand/70 transition-colors">{block.day}</p>
                <span className="text-[10px] text-muted-foreground ml-auto pr-1">{isCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-1.5">
                  {block.activities.map((activity) => (
                    <div key={activity} className="flex items-start gap-2.5 rounded-lg bg-brand-subtle px-3 py-2 text-sm text-muted-foreground">
                      <span className="text-base leading-none">{activityIcon(activity)}</span>
                      <span className="leading-snug">{activity}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TripCard({ trip, featured, compact }: { trip: Trip; featured: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <>
        <Card
          className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${featured ? "ring-2 ring-brand" : ""}`}
          onClick={() => setOpen(true)}
        >
          <div className={`bg-gradient-to-br ${trip.gradient} h-20 flex items-end p-4 relative`}>
            {featured && (
              <Badge className="absolute top-2 right-2 bg-brand text-brand-foreground text-xs">★</Badge>
            )}
            <div>
              <p className="text-white/80 text-xs font-medium">{trip.emoji} {trip.tagline}</p>
              <h3 className="text-white text-base font-bold leading-tight">{trip.destination}</h3>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1 mb-3">
              {trip.themes.slice(0, 2).map((theme) => (
                <Badge key={theme} variant="secondary" className="text-xs">{theme}</Badge>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{trip.duration} · ab</p>
                <p className="text-base font-bold text-foreground">€{trip.price.toLocaleString()}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
              >
                Details →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {trip.emoji} {trip.destination} — {trip.duration}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">{trip.description}</p>
            <h4 className="font-semibold text-foreground mb-4">Reiseverlauf</h4>
            <ItineraryTimeline itinerary={trip.itinerary} />
            <div className="mb-1" />
            <h4 className="font-semibold text-foreground mb-3">Budget-Aufteilung <span className="text-muted-foreground font-normal text-sm">pro Person</span></h4>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {Object.entries(trip.budget).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm bg-brand-subtle rounded-lg px-3 py-2">
                  <span className="text-muted-foreground capitalize">{key === "flights" ? "Flug" : key === "hotel" ? "Hotel" : key === "activities" ? "Aktivitäten" : "Essen"}</span>
                  <span className="font-medium">€{val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <a
                href={trip.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-brand hover:text-brand-foreground transition-colors"
              >
                Flüge suchen ↗
              </a>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Schließen</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
    <Card
      className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow ${
        featured ? "ring-2 ring-brand" : ""
      }`}
    >
      {/* Image gradient header */}
      <div className={`bg-gradient-to-br ${trip.gradient} h-40 flex items-end p-5`}>
        {featured && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-brand text-brand-foreground text-xs">Empfohlen</Badge>
          </div>
        )}
        <div>
          <p className="text-white/80 text-sm font-medium">{trip.emoji} {trip.tagline}</p>
          <h3 className="text-white text-2xl font-bold">{trip.destination}</h3>
        </div>
      </div>

      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{trip.description}</p>

        {/* Themes */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {trip.themes.map((theme) => (
            <Badge key={theme} variant="secondary" className="text-xs">
              {theme}
            </Badge>
          ))}
        </div>

        {/* Highlights */}
        <div className="space-y-1.5 mb-5">
          {trip.highlights.map((h) => (
            <div key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-brand text-xs">✓</span>
              <span>{h}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">{trip.duration} · ab</p>
            <p className="text-xl font-bold text-foreground">€{trip.price.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">pro Person</p>
          </div>
          <Button size="sm" className={featured ? "bg-brand hover:bg-brand/80" : ""} onClick={() => setOpen(true)}>
            Details →
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {trip.emoji} {trip.destination} — {trip.duration}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-4">{trip.description}</p>

        {/* Itinerary Timeline */}
        <h4 className="font-semibold text-foreground mb-4">Reiseverlauf</h4>
        <ItineraryTimeline itinerary={trip.itinerary} />
        <div className="mb-1" />

        {/* Budget breakdown */}
        <h4 className="font-semibold text-foreground mb-3">Budget-Aufteilung <span className="text-muted-foreground font-normal text-sm">pro Person</span></h4>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {Object.entries(trip.budget).map(([key, val]) => (
            <div key={key} className="flex justify-between text-sm bg-brand-subtle rounded-lg px-3 py-2">
              <span className="text-muted-foreground capitalize">{key === "flights" ? "Flug" : key === "hotel" ? "Hotel" : key === "activities" ? "Aktivitäten" : "Essen"}</span>
              <span className="font-medium">€{val}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a
            href={trip.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-brand hover:text-brand-foreground transition-colors"
          >
            Flüge suchen ↗
          </a>
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

