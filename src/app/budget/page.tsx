"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { BudgetBreakdown, type BudgetEstimate } from "@/components/budget-breakdown";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";

const QUICK_DESTINATIONS = ["Japan", "Portugal", "Bali", "Thailand", "Italy", "Mexico", "Vietnam", "Greece"];

export default function BudgetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      }
    >
      <BudgetContent />
    </Suspense>
  );
}

function BudgetContent() {
  const searchParams = useSearchParams();

  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [travelers, setTravelers] = useState(Number(searchParams.get("travelers") || 2));
  const [budget, setBudget] = useState(Number(searchParams.get("budget") || 2000));

  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Auto-run if URL has all required params pre-filled
  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    if (
      searchParams.get("destination") &&
      searchParams.get("startDate") &&
      searchParams.get("endDate")
    ) {
      didAutoRun.current = true;
      runAnalysis({
        destination: searchParams.get("destination")!,
        startDate: searchParams.get("startDate")!,
        endDate: searchParams.get("endDate")!,
        travelers: Number(searchParams.get("travelers") || 2),
        budget: Number(searchParams.get("budget") || 2000),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis(params: {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: number;
  }) {
    if (!params.destination.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setTrace([]);
    setEstimate(null);
    setError(null);

    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") { setLoading(false); break; }

          let parsed: {
            type: string;
            id?: string;
            tool?: string;
            input?: Record<string, unknown>;
            iteration?: number;
            message?: string;
            lines?: BudgetEstimate["lines"];
            totalPerPerson?: number;
            totalAll?: number;
            verdict?: BudgetEstimate["verdict"];
            verdictNote?: string;
          };
          try { parsed = JSON.parse(data); } catch { continue; }

          if (parsed.type === "error") {
            setError(parsed.message ?? "Something went wrong.");
            setLoading(false);
            return;
          }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool) {
            setTrace((prev) => [
              ...prev,
              { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" },
            ]);
          }
          if (parsed.type === "tool_done" && parsed.id) {
            setTrace((prev) =>
              prev.map((e) => (e.id === parsed.id ? { ...e, status: "done" } : e))
            );
          }
          if (parsed.type === "budget") {
            setEstimate({
              lines: parsed.lines!,
              totalPerPerson: parsed.totalPerPerson!,
              totalAll: parsed.totalAll!,
              verdict: parsed.verdict!,
              verdictNote: parsed.verdictNote!,
            });
            setLoading(false);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runAnalysis({ destination, startDate, endDate, travelers, budget });
  }

  const nights =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
      : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link href="/plan" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
          Plan a trip
        </Link>
        <Link href="/research" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
          Research
        </Link>
      </SiteNav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">Budget Checker</p>
            <h1 className="text-headline font-heading font-extrabold text-foreground tracking-[-0.03em] mb-3">
              Can you afford it?
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your destination and budget — the AI researches real costs and gives you an honest verdict.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-6 mb-8 space-y-5">
            {/* Destination */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Destination
              </label>
              <input
                type="text"
                placeholder="Japan, Portugal, Bali…"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              {/* Quick picks */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_DESTINATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDestination(d)}
                    className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                      destination === d
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  To {nights && <span className="font-normal text-brand">· {nights} nights</span>}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>

            {/* Travelers + Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  Travelers
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTravelers((t) => Math.max(1, t - 1))}
                    className="w-10 h-10 rounded-xl border border-border bg-background text-foreground text-lg font-semibold hover:border-foreground transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold text-foreground">{travelers}</span>
                  <button
                    type="button"
                    onClick={() => setTravelers((t) => Math.min(10, t + 1))}
                    className="w-10 h-10 rounded-xl border border-border bg-background text-foreground text-lg font-semibold hover:border-foreground transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  Budget / person (€)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !destination.trim()}
              className="w-full bg-foreground text-background py-3.5 rounded-xl font-semibold text-sm uppercase tracking-[0.15em] hover:bg-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Researching…" : "Analyze budget →"}
            </button>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl animate-pulse">🔍</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Budget Agent is researching</p>
                  <p className="text-xs text-muted-foreground">Searching current costs for flights, hotels, food, activities…</p>
                </div>
              </div>
              {trace.length > 0 && <AgentTrace trace={trace} />}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6 text-center">
              <span className="text-2xl block mb-2">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Result */}
          {estimate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Budget estimate for {destination}
                </h2>
                {trace.length > 0 && (
                  <span className="text-xs text-muted-foreground">{trace.filter((t) => t.status === "done").length} sources checked</span>
                )}
              </div>
              <BudgetBreakdown estimate={estimate} userBudget={budget} travelers={travelers} />

              {/* Next steps */}
              <div className="bg-surface rounded-2xl border border-border p-5 mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">Next steps</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/plan?destination=${encodeURIComponent(destination)}${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}&travelers=${travelers}&budget=${budget}`}
                    className="flex-1 text-center bg-foreground text-background py-3 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] hover:bg-brand transition-colors"
                  >
                    Plan this trip →
                  </Link>
                  <Link
                    href={`/research?destination=${encodeURIComponent(destination)}`}
                    className="flex-1 text-center border border-border text-foreground py-3 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] hover:border-foreground transition-colors"
                  >
                    Research destination
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
