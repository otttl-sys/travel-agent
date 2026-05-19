"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const INTEREST_OPTIONS = [
  { label: "Essen & Kulinarik", value: "food" },
  { label: "Kultur & Geschichte", value: "culture" },
  { label: "Natur & Outdoor", value: "nature" },
  { label: "Nightlife", value: "nightlife" },
  { label: "Shopping", value: "shopping" },
  { label: "Familie", value: "family" },
];

const RESEARCH_STEPS = [
  { tool: "get_visa_requirements", label: "Visa & Einreise wird geprüft..." },
  { tool: "get_climate_info", label: "Klima & Wetter wird analysiert..." },
  { tool: "get_safety_info", label: "Sicherheitslage wird geprüft..." },
  { tool: "get_local_tips", label: "Lokale Tipps werden gesammelt..." },
  { tool: "get_best_time_to_visit", label: "Beste Reisezeit wird ermittelt..." },
];

export default function ResearchPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [passportCountry, setPassportCountry] = useState("Deutschland");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [completedTools, setCompletedTools] = useState<string[]>([]);
  const [activeToolLabel, setActiveToolLabel] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setCompletedTools([]);
    setActiveToolLabel("Research Agent startet...");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, passportCountry, interests }),
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
          if (data === "[DONE]") break;

          let parsed: { type: string; tool?: string; text?: string; message?: string };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          if (parsed.type === "error") {
            setError(parsed.message ?? "Fehler beim Research.");
            setLoading(false);
            return;
          }
          if (parsed.type === "tool_call" && parsed.tool) {
            const step = RESEARCH_STEPS.find((s) => s.tool === parsed.tool);
            if (step) {
              setActiveToolLabel(step.label);
              setCompletedTools((prev) => [...prev, parsed.tool!]);
            }
          }
          if (parsed.type === "result") {
            setResult(parsed.text ?? "");
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <span className="text-2xl">✈</span>
            <span className="font-semibold text-gray-900 text-lg">TravelAgent</span>
          </button>
          <Button variant="outline" size="sm" onClick={() => router.push("/plan")}>
            Reise planen
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {!loading && !result && (
          <>
            <div className="mb-10">
              <Badge variant="secondary" className="mb-4 text-xs">
                Destination Research
              </Badge>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Alles über dein
                <br />
                <span className="text-indigo-600">Reiseziel</span>
              </h1>
              <p className="mt-4 text-gray-500 leading-relaxed">
                Visa, Klima, Sicherheit, lokale Tipps — der Research Agent durchsucht aktuelle Quellen
                und fasst alles zusammen, bevor du buchst.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wohin willst du reisen?
                </label>
                <Input
                  placeholder="z.B. Japan, Bali, Marokko, New York..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="text-base"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dein Reisepass / Nationalität
                </label>
                <Input
                  placeholder="z.B. Deutschland, Österreich, Schweiz"
                  value={passportCountry}
                  onChange={(e) => setPassportCountry(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Für genaue Visa-Informationen</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Worauf soll der Fokus liegen? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleInterest(opt.value)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        interests.includes(opt.value)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full py-6 text-base"
                disabled={!destination.trim()}
              >
                Research starten →
              </Button>
            </form>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-6 animate-pulse">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Research läuft...</h2>
            <p className="text-gray-500 text-sm mb-10">{activeToolLabel}</p>

            <div className="w-full max-w-sm space-y-3">
              {RESEARCH_STEPS.map((step) => {
                const done = completedTools.includes(step.tool);
                const active = activeToolLabel === step.label;
                return (
                  <div
                    key={step.tool}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      done ? "text-green-600" : active ? "text-indigo-600 font-medium" : "text-gray-300"
                    }`}
                  >
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler beim Research</h2>
            <p className="text-gray-500 text-sm mb-8">{error}</p>
            <Button onClick={() => { setError(null); setLoading(false); }}>Nochmal versuchen</Button>
          </div>
        )}

        {result && !loading && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="secondary" className="mb-2 text-xs">Research abgeschlossen</Badge>
                <h2 className="text-2xl font-bold text-gray-900">{destination}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setDestination(""); }}>
                Neues Research
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🔍</span>
                <span className="font-semibold text-gray-900">Dein Reise-Research von Claude</span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => router.push(`/plan?destination=${encodeURIComponent(destination)}`)}>
                Jetzt Reise planen →
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setDestination(""); }}>
                Neues Research
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
