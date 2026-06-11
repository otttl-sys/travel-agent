"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TRIP_TYPES = [
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "city", label: "City Trip", icon: "🏙️" },
  { id: "mountains", label: "Mountains", icon: "⛰️" },
  { id: "adventure", label: "Adventure", icon: "🧗" },
  { id: "winter", label: "Winter / Ski", icon: "⛷️" },
  { id: "luxury", label: "Luxury", icon: "✨" },
];

export default function PackingPage() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripType, setTripType] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days =
    startDate && endDate
      ? Math.round(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  async function generate() {
    if (!destination.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          tripType,
          days: days && days > 0 ? days : undefined,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n").filter((l) => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token") {
              text += parsed.text ?? "";
              setResult(text);
              setLoading(false);
            } else if (parsed.type === "error") {
              setError(parsed.message);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Nav */}
      <nav className="bg-[#faf9f6] border-b border-[#e5e2dc] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-[#1a1a1a] text-sm tracking-[0.2em] uppercase">
            TravelAgent
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/saved"
              className="text-xs uppercase tracking-[0.18em] text-[#57534e] hidden sm:block hover:text-[#1a1a1a] transition-colors"
            >
              Saved Trips
            </Link>
            <Link href="/plan">
              <button className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-[#e85d3a] transition-colors">
                Plan a trip
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <span className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em]">
              AI Packing Agent
            </span>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[#1a1a1a] mt-1 mb-2">
              Packing List Generator
            </h1>
            <p className="text-[#78716c]">
              Describe your trip and AI builds a tailored checklist — specific to your destination, not generic advice.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-[#e5e2dc] p-8 mb-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#44403c] mb-1">
                  Destination
                </label>
                <Input
                  placeholder="e.g. Thailand, Tokyo, Swiss Alps..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="text-base"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && destination.trim()) generate();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-1">
                    Departure
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-1">
                    Return
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {days !== null && days > 0 && (
                <p className="text-sm text-[#a8a29e]">→ {days} days</p>
              )}

              <div>
                <label className="block text-sm font-medium text-[#44403c] mb-3">
                  Trip Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TRIP_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() =>
                        setTripType((prev) => (prev === t.id ? "" : t.id))
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                        tripType === t.id
                          ? "border-[#e85d3a] bg-[#fdf0ec] text-[#e85d3a]"
                          : "border-[#e5e2dc] text-[#57534e] hover:border-[#e85d3a]"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={!destination.trim() || loading}
                className="w-full py-5 text-base bg-[#1a1a1a] hover:bg-[#e85d3a]"
              >
                {loading ? "Generating…" : "Generate Packing List →"}
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {loading && !result && (
            <div className="bg-white rounded-2xl border border-[#e5e2dc] p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse">🎒</div>
              <p className="text-[#78716c]">Building your packing list…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-white rounded-2xl border border-[#e5e2dc] p-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎒</span>
                  <h3 className="font-semibold text-[#1a1a1a]">
                    {destination}
                    {days && days > 0 ? ` · ${days} days` : ""}
                    {tripType
                      ? ` · ${TRIP_TYPES.find((t) => t.id === tripType)?.label}`
                      : ""}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="no-print"
                >
                  Print / PDF
                </Button>
              </div>
              <div className="prose prose-sm max-w-none text-[#44403c] leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
