"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DISRUPTION_TYPES = [
  { value: "delay", label: "Verspätung", icon: "⏱️" },
  { value: "cancellation", label: "Annullierung", icon: "❌" },
  { value: "denied_boarding", label: "Gate-Ausschluss", icon: "🚫" },
  { value: "diversion", label: "Umleitung", icon: "↩️" },
];

const TOOL_STEPS = [
  { tool: "check_flight_status",     label: "Flugstatus wird geprüft..." },
  { tool: "find_alternative_flights",label: "Alternative Flüge werden gesucht..." },
  { tool: "check_passenger_rights",  label: "Fahrgastrechte werden ermittelt..." },
  { tool: "find_airport_lounge",     label: "Lounge-Optionen werden geprüft..." },
  { tool: "find_airport_hotel",      label: "Hotels am Flughafen werden gesucht..." },
];

export default function DisruptionPage() {
  const router = useRouter();
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [disruptionType, setDisruptionType] = useState("delay");

  const [loading, setLoading] = useState(false);
  const [completedTools, setCompletedTools] = useState<string[]>([]);
  const [activeToolLabel, setActiveToolLabel] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setCompletedTools([]);
    setActiveToolLabel("Disruption Agent startet...");

    try {
      const res = await fetch("/api/disruption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightNumber, date, origin, destination, travelers: Number(travelers), disruptionType }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;

          let parsed: { type: string; tool?: string; text?: string; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }

          if (parsed.type === "error") {
            setError(parsed.message ?? "Fehler beim Abrufen.");
            setLoading(false);
            return;
          }
          if (parsed.type === "tool_call" && parsed.tool) {
            const step = TOOL_STEPS.find((s) => s.tool === parsed.tool);
            if (step) {
              setActiveToolLabel(step.label);
              setCompletedTools((prev) => [...prev, parsed.tool!]);
            }
          }
          if (parsed.type === "token") {
            accumulated += parsed.text ?? "";
            setResult(accumulated);
            if (loading) setLoading(false);
          }
          if (parsed.type === "result") {
            setResult(parsed.text ?? "");
            setLoading(false);
          }
        }
      }
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Nav */}
      <nav className="bg-[#faf9f6] border-b border-[#e5e2dc] px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/")} className="font-bold text-[#1a1a1a] text-sm tracking-[0.2em] uppercase">
            TravelAgent
          </button>
          <div className="flex items-center gap-3">
            <Link href="/research" className="text-xs uppercase tracking-[0.18em] text-[#57534e] hover:text-[#1a1a1a] transition-colors">Research</Link>
            <button
              onClick={() => router.push("/plan")}
              className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-[#e85d3a] transition-colors"
            >
              Reise planen
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">

        {!loading && !result && (
          <>
            <div className="mb-10">
              <Badge variant="secondary" className="mb-4 text-xs bg-[#fdf0ec] text-[#e85d3a] border-[#f5ddd4]">
                Disruption Management
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[#1a1a1a] leading-tight">
                Flug gestört?
                <br />
                <span className="text-[#e85d3a]">Wir lösen das.</span>
              </h1>
              <p className="mt-4 text-[#78716c] leading-relaxed">
                Flugnummer eingeben — der Agent prüft den Status, findet Alternativen und klärt deine Fahrgastrechte.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-2">Flugnummer *</label>
                  <Input
                    placeholder="z.B. LH401, BA112"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                    className="text-base font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-2">Datum</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-2">Von (Flughafen)</label>
                  <Input placeholder="z.B. FRA, MUC" value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-2">Nach (Flughafen)</label>
                  <Input placeholder="z.B. JFK, LHR" value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#44403c] mb-3">Art der Störung</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DISRUPTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDisruptionType(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        disruptionType === t.value
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#44403c] mb-2">Reisende</label>
                  <Input type="number" min="1" max="9" value={travelers} onChange={(e) => setTravelers(e.target.value)} />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full py-6 text-base bg-[#1a1a1a] hover:bg-[#e85d3a]"
                disabled={!flightNumber.trim()}
              >
                Agent starten →
              </Button>
            </form>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-6 animate-pulse">🚨</div>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1a1a1a] mb-2">Disruption Agent arbeitet...</h2>
            <p className="text-[#78716c] text-sm mb-10">{activeToolLabel}</p>
            <div className="w-full max-w-sm space-y-3">
              {TOOL_STEPS.map((step) => {
                const done = completedTools.includes(step.tool);
                const active = activeToolLabel === step.label;
                return (
                  <div key={step.tool} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    done ? "text-green-600" : active ? "text-[#e85d3a] font-medium" : "text-[#d6d2cb]"
                  }`}>
                    <span className="w-4 text-center">{done ? "✓" : active ? "→" : "○"}</span>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-6">⚠️</div>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1a1a1a] mb-2">Fehler</h2>
            <p className="text-[#78716c] text-sm mb-8">{error}</p>
            <Button onClick={() => { setError(null); setLoading(false); }}>Nochmal versuchen</Button>
          </div>
        )}

        {result && !loading && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="secondary" className="mb-2 text-xs bg-[#fdf0ec] text-[#e85d3a] border-[#f5ddd4]">
                  Disruption Report
                </Badge>
                <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1a1a1a]">Flug {flightNumber}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setFlightNumber(""); }}>
                Neuer Flug
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-[#f5ddd4] p-8 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🚨</span>
                <span className="font-semibold text-[#1a1a1a]">Disruption Report von Claude</span>
              </div>
              <div className="prose prose-sm max-w-none text-[#44403c] leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 bg-[#1a1a1a] hover:bg-[#e85d3a]" onClick={() => { setResult(null); setFlightNumber(""); }}>
                Neuer Flug prüfen
              </Button>
              <Button variant="outline" onClick={() => router.push("/plan")}>
                Neue Reise planen
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
