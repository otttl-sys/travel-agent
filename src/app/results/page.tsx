"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  },
];

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">🤖</div>
            <p className="text-gray-500">Agenten starten…</p>
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const destination = searchParams.get("destination") || "";
  const budget = Number(searchParams.get("budget") || 3000);

  const loadingSteps = [
    "Orchestrator Agent startet...",
    "Flight Agent sucht beste Verbindungen...",
    "Hotel Agent prüft Verfügbarkeiten...",
    "Activity Agent plant Erlebnisse...",
    "Budget Agent optimiert Kosten...",
    "Reisepläne werden zusammengestellt...",
  ];

  useEffect(() => {
    const params = {
      destination,
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      travelers: searchParams.get("travelers") || "2",
      interests: searchParams.get("interests") || "",
      budget,
    };

    let stepIndex = 0;

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 1.5, 90);
        const newStep = Math.floor((next / 100) * loadingSteps.length);
        if (newStep !== stepIndex && newStep < loadingSteps.length) {
          stepIndex = newStep;
          setLoadingStep(newStep);
        }
        return next;
      });
    }, 200);

    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).then(async (res) => {
      clearInterval(progressInterval);
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

          const parsed = JSON.parse(data);
          if (parsed.type === "tool_call") {
            const toolIdx = loadingSteps.findIndex((s) =>
              s.toLowerCase().includes(parsed.tool.split("_")[1] || "")
            );
            if (toolIdx >= 0) setLoadingStep(toolIdx);
          }
          if (parsed.type === "result") {
            result = parsed.text;
          }
        }
      }

      setProgress(100);
      setLoadingStep(loadingSteps.length - 1);
      setTimeout(() => {
        setAiResult(result);
        setLoading(false);
      }, 500);
    }).catch(() => {
      clearInterval(progressInterval);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6 animate-pulse">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI analysiert deine Reise</h2>
          <p className="text-gray-500 text-sm mb-8">
            {destination ? `Wir suchen die besten Optionen für ${destination}.` : "Mehrere Agenten arbeiten für dich."}
          </p>
          <div className="space-y-2 mb-8">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
          <div className="space-y-2">
            {loadingSteps.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  i < loadingStep
                    ? "text-green-600"
                    : i === loadingStep
                    ? "text-indigo-600 font-medium"
                    : "text-gray-300"
                }`}
              >
                <span>{i < loadingStep ? "✓" : i === loadingStep ? "→" : "○"}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredTrips = MOCK_TRIPS.filter((t) =>
    destination ? t.price <= budget * 1.2 : true
  );

  const displayTrips = filteredTrips.length > 0 ? filteredTrips : MOCK_TRIPS;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="font-semibold text-gray-900"
          >
            ✈ TravelAgent
          </button>
          <Button variant="outline" size="sm" onClick={() => router.push("/plan")}>
            Neue Suche
          </Button>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Badge variant="secondary" className="mb-3 text-xs">
              AI hat 3 Reisen für dich zusammengestellt
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">
              {destination ? `Deine Reisevorschläge für ${destination}` : "Deine Reisevorschläge"}
            </h1>
            <p className="text-gray-500 mt-2">
              {searchParams.get("travelers") || "2"} Personen ·{" "}
              {searchParams.get("startDate") || "Flexibles Datum"} ·{" "}
              Budget €{budget.toLocaleString()} pro Person
            </p>
          </div>

          {/* Trip Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {displayTrips.map((trip, index) => (
              <TripCard key={trip.id} trip={trip} featured={index === 0} />
            ))}
          </div>

          {/* AI Result */}
          {aiResult && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">🤖</span>
                <h3 className="font-semibold text-gray-900">Dein persönlicher Reiseplan von Claude</h3>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiResult}
              </div>
            </div>
          )}

          {/* Agent Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Was die Agenten analysiert haben</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {agentSummary.map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-gray-50">
                  <span className="text-2xl block mb-2">{item.icon}</span>
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TripCard({ trip, featured }: { trip: Trip; featured: boolean }) {
  return (
    <Card
      className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow ${
        featured ? "ring-2 ring-indigo-600" : ""
      }`}
    >
      {/* Image gradient header */}
      <div className={`bg-gradient-to-br ${trip.gradient} h-40 flex items-end p-5`}>
        {featured && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-indigo-600 text-white text-xs">Empfohlen</Badge>
          </div>
        )}
        <div>
          <p className="text-white/80 text-sm font-medium">{trip.emoji} {trip.tagline}</p>
          <h3 className="text-white text-2xl font-bold">{trip.destination}</h3>
        </div>
      </div>

      <CardContent className="p-5">
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{trip.description}</p>

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
            <div key={h} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-indigo-400 text-xs">✓</span>
              <span>{h}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">{trip.duration} · ab</p>
            <p className="text-xl font-bold text-gray-900">€{trip.price.toLocaleString()}</p>
            <p className="text-xs text-gray-400">pro Person</p>
          </div>
          <Button size="sm" className={featured ? "bg-indigo-600 hover:bg-indigo-700" : ""}>
            Details →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const agentSummary = [
  { icon: "✈️", label: "Flüge analysiert", value: "847" },
  { icon: "🏨", label: "Hotels geprüft", value: "1.240" },
  { icon: "🗺️", label: "Aktivitäten", value: "320+" },
  { icon: "💰", label: "Einsparung ø", value: "€340" },
];
