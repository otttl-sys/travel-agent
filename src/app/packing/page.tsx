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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">
            ✈ TravelAgent
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/saved"
              className="text-sm text-gray-500 hidden sm:block hover:text-indigo-600 transition-colors"
            >
              Saved Trips
            </Link>
            <Link href="/plan">
              <Button size="sm">Plan a trip</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">
              AI Packing Agent
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1 mb-2">
              Packing List Generator
            </h1>
            <p className="text-gray-500">
              Describe your trip and AI builds a tailored checklist — specific to your destination, not generic advice.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <p className="text-sm text-gray-400">→ {days} days</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
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
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:border-indigo-300"
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
                className="w-full py-5 text-base bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? "Generating…" : "Generate Packing List →"}
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {loading && !result && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse">🎒</div>
              <p className="text-gray-500">Building your packing list…</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎒</span>
                  <h3 className="font-semibold text-gray-900">
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
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
