"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSavedTrips, deleteTrip, updatePriceWatch, type SavedTrip, type PriceWatch } from "@/lib/saved-trips";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";

const TREND_META: Record<PriceWatch["trend"], { emoji: string; label: string }> = {
  down: { emoji: "📉", label: "Wirkt günstiger" },
  up: { emoji: "📈", label: "Wirkt teurer" },
  same: { emoji: "➡️", label: "Etwa gleich geblieben" },
};

function detectTrend(text: string): PriceWatch["trend"] {
  const lower = text.toLowerCase();
  if (/günstiger|billiger|gesunken|gefallen|niedriger/.test(lower)) return "down";
  if (/teurer|gestiegen|höher|angestiegen/.test(lower)) return "up";
  return "same";
}

function formatCheckedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showProdPanel, setShowProdPanel] = useState(false);

  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceEntry[]>>({});
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});

  useEffect(() => {
    setTrips(getSavedTrips());
  }, []);

  function handleDelete(id: string) {
    deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (expanded === id) setExpanded(null);
  }

  async function checkPrice(trip: SavedTrip) {
    if (checkingId) return;
    setCheckingId(trip.id);
    setTraces((prev) => ({ ...prev, [trip.id]: [] }));
    setVerdicts((prev) => ({ ...prev, [trip.id]: "" }));

    const baseline = trip.cards?.[0]?.budget;
    const body = {
      destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      style: "comfort",
      baselineFlights: baseline?.flights ?? null,
      baselineHotel: baseline?.hotel ?? null,
    };

    try {
      const res = await fetch("/api/price-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;

          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; text?: string; message?: string };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool) {
            setTraces((prev) => ({
              ...prev,
              [trip.id]: [
                ...(prev[trip.id] ?? []),
                { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" },
              ],
            }));
          }
          if (parsed.type === "tool_done" && parsed.id) {
            setTraces((prev) => ({
              ...prev,
              [trip.id]: (prev[trip.id] ?? []).map((entry) => (entry.id === parsed.id ? { ...entry, status: "done" } : entry)),
            }));
          }
          if (parsed.type === "token") {
            result = result + (parsed.text ?? "");
            const text = result;
            setVerdicts((prev) => ({ ...prev, [trip.id]: text }));
          }
          if (parsed.type === "result") {
            result = parsed.text ?? result;
            const text = result;
            setVerdicts((prev) => ({ ...prev, [trip.id]: text }));
          }
          if (parsed.type === "error") {
            result = parsed.message ?? "Preis-Check fehlgeschlagen.";
            const text = result;
            setVerdicts((prev) => ({ ...prev, [trip.id]: text }));
          }
        }
      }

      if (result.trim()) {
        const priceWatch: PriceWatch = {
          lastChecked: new Date().toISOString(),
          trend: detectTrend(result),
          summary: result.trim(),
        };
        updatePriceWatch(trip.id, priceWatch);
        setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, priceWatch } : t)));
      }
    } catch {
      setVerdicts((prev) => ({ ...prev, [trip.id]: "Verbindungsfehler beim Preis-Check. Bitte erneut versuchen." }));
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">
            ✈ TravelAgent
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/packing"
              className="text-sm text-gray-500 hidden sm:block hover:text-indigo-600 transition-colors"
            >
              Packing List
            </Link>
            <Link href="/plan">
              <Button size="sm">Plan a trip</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Saved Trips</h1>
            <p className="text-gray-500 mt-1">
              {trips.length} {trips.length === 1 ? "trip" : "trips"} saved
            </p>
          </div>

          {trips.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <button
                onClick={() => setShowProdPanel((v) => !v)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
              >
                🏗️ So würde der Price Watcher in Produktion laufen
                <span className={`transition-transform ${showProdPanel ? "rotate-180" : ""}`}>▾</span>
              </button>
              {showProdPanel && (
                <div className="mt-4 text-sm text-gray-600 leading-relaxed space-y-2 max-w-2xl">
                  <p>
                    Der Button &quot;Preis jetzt prüfen&quot; startet hier denselben Agenten live, on-demand — er
                    sucht aktuelle Flug- und Hotelpreise und vergleicht sie mit dem Ausgangspreis. In Produktion
                    würde genau dieser Agent automatisch im Hintergrund laufen, statt auf einen Klick zu warten:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li><strong>Vercel Cron</strong> triggert den Price Watcher täglich für jede Reise mit aktivierter Preisüberwachung.</li>
                    <li>Ergebnisse landen statt im localStorage in einer <strong>Datenbank</strong> (z. B. Vercel Postgres oder KV) — so bleiben sie geräte- und sitzungsübergreifend verfügbar.</li>
                    <li>Bei einer relevanten Preisänderung verschickt der Agent einen <strong>E-Mail-Digest</strong> (z. B. via Resend) — &quot;Dein Lissabon-Trip ist 18 % günstiger geworden, jetzt buchen?&quot;</li>
                  </ul>
                  <p className="text-gray-400 text-xs pt-1">
                    Hier bewusst als On-Demand-Agent umgesetzt, um den vollen Trace live zu zeigen — die Architektur
                    für den autonomen Betrieb ist identisch, nur der Auslöser wechselt von Klick zu Cron.
                  </p>
                </div>
              )}
            </div>
          )}

          {trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">✈️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved trips yet</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Plan a trip and tap &quot;Save Trip&quot; to see it here.
              </p>
              <Link href="/plan">
                <Button>Plan your first trip →</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {trip.isMultiCity
                              ? trip.cities.join(" → ")
                              : trip.destination}
                          </h3>
                          {trip.isMultiCity && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Multi-City
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                          {trip.startDate && (
                            <span>
                              📅 {trip.startDate}
                              {trip.endDate ? ` → ${trip.endDate}` : ""}
                            </span>
                          )}
                          <span>
                            👥 {trip.travelers}{" "}
                            {trip.travelers === 1 ? "person" : "people"}
                          </span>
                          <span>💶 €{trip.budget.toLocaleString()} / person</span>
                          <span className="text-gray-400">
                            Saved{" "}
                            {new Date(trip.savedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {trip.priceWatch && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-600">
                            <span>{TREND_META[trip.priceWatch.trend].emoji}</span>
                            <span className="font-medium">{TREND_META[trip.priceWatch.trend].label}</span>
                            <span className="text-gray-400">· geprüft am {formatCheckedDate(trip.priceWatch.lastChecked)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={checkingId !== null}
                          onClick={() => checkPrice(trip)}
                        >
                          {checkingId === trip.id ? "Prüft…" : "🔍 Preis jetzt prüfen"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpanded((prev) =>
                              prev === trip.id ? null : trip.id
                            )
                          }
                        >
                          {expanded === trip.id ? "Hide" : "View Plan"}
                        </Button>
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none p-1"
                          aria-label="Delete trip"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>

                  {(checkingId === trip.id || (traces[trip.id]?.length ?? 0) > 0) && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                        Price Watcher Agent
                      </p>
                      <AgentTrace trace={traces[trip.id] ?? []} />
                      {verdicts[trip.id] && (
                        <div className="mt-4 rounded-lg bg-white border border-gray-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                          {verdicts[trip.id]}
                        </div>
                      )}
                    </div>
                  )}

                  {expanded === trip.id && trip.aiResult && (
                    <div className="border-t border-gray-100 p-6">
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown>{trip.aiResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
