import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈</span>
            <span className="font-semibold text-gray-900 text-lg">TravelAgent</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/research" className="text-sm text-gray-500 hidden sm:block hover:text-indigo-600 transition-colors">
              Research
            </Link>
            <Link href="/disruption" className="text-sm text-gray-500 hidden sm:block hover:text-red-600 transition-colors">
              Disruption
            </Link>
            <Link href="/plan">
              <Button size="sm">Reise planen</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <Badge variant="secondary" className="mb-6 text-xs font-medium">
            Powered by Agentic AI
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Dein persönlicher
            <br />
            <span className="text-indigo-600">AI Travel Agent</span>
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Beschreibe einfach deine Traumreise. Unser AI-Agent analysiert Flüge, Hotels
            und Aktivitäten — und baut dir einen kompletten Reiseplan.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/plan">
              <Button size="lg" className="px-8 py-6 text-base">
                Reise planen →
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-6 text-base">
              Beispiel ansehen
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            Kostenlos · Keine Anmeldung nötig · In 2 Minuten fertig
          </p>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-12">
              Wie es funktioniert
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agent grid */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-4">
              Mehrere Agenten. Ein perfekter Trip.
            </h2>
            <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
              Im Hintergrund arbeiten spezialisierte AI-Agenten parallel — jeder ein Experte auf seinem Gebiet.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <span className="text-2xl mb-3 block">{agent.icon}</span>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{agent.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-indigo-600 py-16 px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bereit für deine nächste Reise?
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Sag uns wohin — der Rest ist Sache des Agenten.
          </p>
          <Link href="/plan">
            <Button size="lg" variant="secondary" className="px-8 py-6 text-base font-semibold">
              Jetzt kostenlos planen →
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <span>✈</span>
          <span>TravelAgent — AI Travel Planning</span>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  {
    number: "1",
    title: "Wünsche eingeben",
    description:
      "Destination, Datum, Reisende, Interessen und Budget — in wenigen Klicks.",
  },
  {
    number: "2",
    title: "AI analysiert",
    description:
      "Mehrere spezialisierte Agenten suchen gleichzeitig nach den besten Optionen.",
  },
  {
    number: "3",
    title: "Plan erhalten",
    description:
      "Du bekommst einen vollständigen Reisevorschlag — anpassbar nach deinen Wünschen.",
  },
];

const agents = [
  {
    icon: "✈️",
    name: "Flight Agent",
    description: "Beste Flüge, günstige Stopps, optimale Zeiten.",
  },
  {
    icon: "🏨",
    name: "Hotel Agent",
    description: "Top Lage, gutes Preis-Leistungs-Verhältnis.",
  },
  {
    icon: "🗺️",
    name: "Activity Agent",
    description: "Kultur, Abenteuer, Restaurants, Tagesplanung.",
  },
  {
    icon: "💰",
    name: "Budget Agent",
    description: "Gesamtkosten optimieren, Alternativen finden.",
  },
  {
    icon: "🔍",
    name: "Research Agent",
    description: "Visa, Klima, Sicherheit, lokale Tipps — alles vor der Buchung.",
  },
  {
    icon: "🚨",
    name: "Disruption Agent",
    description: "Flug gestört? Status, Alternativen und Fahrgastrechte in Sekunden.",
  },
];
