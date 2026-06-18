"use client";

import { Suspense, useEffect, useState } from "react";
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
  const [saved, setSaved] = useState(false);

  const destination = searchParams.get("destination") || "";
  const budget = Number(searchParams.get("budget") || 3000);

  async function handleSave() {
    await saveTrip({
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
  }
  const isMultiCity = searchParams.get("multiCity") === "1";
  const citiesParam = searchParams.get("cities") || "";
  const cityDaysParam = searchParams.get("cityDays") || "";
  const cityNames = isMultiCity ? citiesParam.split(",").filter(Boolean) : [];
  const cityDaysArr = isMultiCity ? cityDaysParam.split(",").map(Number) : [];

  useEffect(() => {
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
        }
      }

      setProgress(100);
      setTimeout(() => {
        setAiResult(result);
        setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="text-5xl mb-6 animate-pulse">🤖</div>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">AI analysiert deine Reise</h2>
          <p className="text-muted-foreground text-sm mb-8">
            {destination ? `Wir suchen die besten Optionen für ${destination}.` : "Mehrere Agenten arbeiten für dich."}
          </p>
          <div className="space-y-2 mb-8">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
          <div className="text-left">
            {trace.length > 0 ? (
              <AgentTrace trace={trace} />
            ) : (
              <p className="text-sm text-muted-foreground text-center">Orchestrator Agent startet…</p>
            )}
          </div>
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
          <Button onClick={() => router.push("/plan")}>Nochmal versuchen</Button>
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
        <Button variant="outline" size="sm" onClick={() => router.push("/plan")}>
          Neue Suche
        </Button>
      </SiteNav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <Badge variant="secondary" className="text-xs">
                {isMultiCity ? `Multi-City Tour · ${cityNames.length} Stationen` : dynamicCards ? "AI hat 3 Reiseoptionen für dich erstellt" : "AI hat 3 Reisen für dich zusammengestellt"}
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
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    PDF
                  </Button>
                </div>
              )}
            </div>
            <h1 className="text-headline font-extrabold tracking-[-0.03em] text-foreground">
              {isMultiCity
                ? cityNames.join(" → ")
                : destination ? `Deine Reisevorschläge für ${destination}` : "Deine Reisevorschläge"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {searchParams.get("travelers") || "2"} Personen ·{" "}
              {searchParams.get("startDate") || "Flexibles Datum"} ·{" "}
              Budget €{budget.toLocaleString()} pro Person
              {isMultiCity && ` · ${cityDaysArr.reduce((s, d) => s + d, 0)} Tage gesamt`}
            </p>
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
          <div className={!isMultiCity && displayTrips.length > 0 ? "flex gap-8 items-start" : ""}>
            <div className="flex-1 min-w-0">
              {/* AI Result */}
              {aiResult && (
                <div className="bg-surface rounded-2xl border border-border p-8 mb-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-semibold text-foreground">Dein persönlicher Reiseplan von Claude</h3>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
                  </div>
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
              <div className="bg-surface rounded-2xl border border-border p-6 no-print">
                <h3 className="font-semibold text-foreground mb-4">Was die Agenten analysiert haben</h3>
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
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Reiseoptionen</p>
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

function BudgetTracker({ budget, aiResult, isMultiCity, travelers }: {
  budget: number;
  aiResult: string | null;
  isMultiCity: boolean;
  travelers: number;
}) {
  const initial = extractBudgetFromAI(aiResult, budget);
  const [items, setItems] = useState<Record<string, number>>(initial);
  const [editing, setEditing] = useState<string | null>(null);

  // Re-sync when AI result arrives
  useEffect(() => {
    if (aiResult) setItems(extractBudgetFromAI(aiResult, budget));
  }, [aiResult, budget]);

  const total = Object.values(items).reduce((s, v) => s + v, 0);
  const remaining = budget - total;
  const pct = Math.min((total / budget) * 100, 100);
  const over = total > budget;

  function update(key: string, val: string) {
    const n = Number(val.replace(/[^0-9]/g, ""));
    if (!isNaN(n)) setItems((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">💶</span>
          <h3 className="font-semibold text-foreground">Budget Tracker</h3>
          <span className="text-xs text-muted-foreground ml-1">pro Person · klicken zum Bearbeiten</span>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${over ? "text-red-600" : "text-green-600"}`}>
            {over ? `−€${Math.abs(remaining).toLocaleString()} über Budget` : `€${remaining.toLocaleString()} übrig`}
          </p>
          <p className="text-xs text-muted-foreground">Budget: €{budget.toLocaleString()} / Person</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-border rounded-full h-2.5 mb-6 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${over ? "bg-red-500" : pct > 85 ? "bg-amber-400" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Line items */}
      <div className="space-y-2 mb-6">
        {BUDGET_CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-brand-subtle transition-colors group">
            <span className="text-lg w-6">{cat.icon}</span>
            <span className="text-sm text-muted-foreground flex-1">{cat.label}</span>
            {editing === cat.key ? (
              <input
                autoFocus
                type="number"
                defaultValue={items[cat.key]}
                onBlur={(e) => { update(cat.key, e.target.value); setEditing(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { update(cat.key, (e.target as HTMLInputElement).value); setEditing(null); } }}
                className="w-24 text-right text-sm font-semibold border border-brand/40 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            ) : (
              <button
                onClick={() => setEditing(cat.key)}
                className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors"
              >
                €{items[cat.key].toLocaleString()}
              </button>
            )}
            <div className="w-20 bg-border rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-brand transition-all duration-300"
                style={{ width: `${Math.min((items[cat.key] / budget) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className={`flex items-center justify-between pt-4 border-t ${over ? "border-red-100 bg-red-50" : "border-border bg-background"} rounded-xl px-4 py-3`}>
        <span className="text-sm font-semibold text-foreground">Gesamt pro Person</span>
        <span className={`text-lg font-bold ${over ? "text-red-600" : "text-foreground"}`}>
          €{total.toLocaleString()}
        </span>
      </div>
      {travelers > 1 && (
        <p className="text-xs text-muted-foreground text-right mt-2">
          {travelers} Personen gesamt: €{(total * travelers).toLocaleString()}
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

  const links = [
    {
      icon: "✈️",
      label: "Flights",
      sub: "Google Flights",
      url: `https://www.google.com/travel/flights?hl=de&q=Flug+nach+${dest}`,
      cardClass: "bg-blue-50 hover:bg-blue-100 border-blue-100",
      labelClass: "text-blue-700",
    },
    {
      icon: "✈️",
      label: "Flights",
      sub: "Skyscanner",
      url: `https://www.skyscanner.de/transport/flights/anywhere/${dest.toLowerCase()}/${startDate.replace(/-/g, "")}/?adults=${travelers}&currency=EUR`,
      cardClass: "bg-sky-50 hover:bg-sky-100 border-sky-100",
      labelClass: "text-sky-700",
    },
    {
      icon: "✈️",
      label: "Flights",
      sub: "Kayak",
      url: `https://www.kayak.de/flights/FRA-${dest}/${startDate}/${endDate}/${travelers}adults`,
      cardClass: "bg-orange-50 hover:bg-orange-100 border-orange-100",
      labelClass: "text-orange-700",
    },
    {
      icon: "🏨",
      label: "Hotels",
      sub: "Booking.com",
      url: `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${startDate}&checkout=${endDate}&group_adults=${travelers}&no_rooms=1&lang=en`,
      cardClass: "bg-amber-50 hover:bg-amber-100 border-amber-100",
      labelClass: "text-amber-700",
    },
    {
      icon: "🏠",
      label: "Apartments",
      sub: "Airbnb",
      url: `https://www.airbnb.de/s/${encodeURIComponent(destRaw)}/homes?checkin=${startDate}&checkout=${endDate}&adults=${travelers}`,
      cardClass: "bg-rose-50 hover:bg-rose-100 border-rose-100",
      labelClass: "text-rose-700",
    },
    {
      icon: "🗺️",
      label: "Activities",
      sub: "GetYourGuide",
      url: `https://www.getyourguide.de/s/?q=${dest}${startDate ? `&date_from=${startDate}` : ""}`,
      cardClass: "bg-green-50 hover:bg-green-100 border-green-100",
      labelClass: "text-green-700",
    },
  ];

  return (
    <div className="bg-surface rounded-2xl border border-border p-8 mb-6 no-print">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🔗</span>
        <h3 className="font-semibold text-foreground">Direkt buchen</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {links.map((link) => (
          <a
            key={link.sub}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${link.cardClass}`}
          >
            <span className="text-2xl">{link.icon}</span>
            <span className={`font-semibold text-xs ${link.labelClass}`}>{link.label}</span>
            <span className="text-xs text-muted-foreground">{link.sub}</span>
          </a>
        ))}
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
  return (
    <ol className="relative mb-6 pl-9">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-brand/40 via-brand/20 to-brand/10" aria-hidden />
      {itinerary.map((block, i) => (
        <li key={block.day} className="relative pb-6 last:pb-0">
          <span className="absolute -left-9 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground ring-4 ring-surface">
            {i + 1}
          </span>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">{block.day}</p>
          <div className="space-y-1.5">
            {block.activities.map((activity) => (
              <div key={activity} className="flex items-start gap-2.5 rounded-lg bg-brand-subtle px-3 py-2 text-sm text-muted-foreground">
                <span className="text-base leading-none">{activityIcon(activity)}</span>
                <span className="leading-snug">{activity}</span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
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

