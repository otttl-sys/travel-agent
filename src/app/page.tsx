"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSearch(dest?: string) {
    const q = dest ?? query;
    if (q.trim()) {
      router.push(`/plan?destination=${encodeURIComponent(q.trim())}`);
    } else {
      router.push("/plan");
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbf7] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#e8e4e0] px-6 py-4 bg-[#fffbf7] sticky top-0 z-50 relative">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✈</span>
            <span className="font-bold text-[#1c1917] text-lg tracking-tight">TravelAgent</span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <Link href="/research" className="text-sm text-[#78716c] hover:text-[#e85d3a] transition-colors">Research</Link>
            <Link href="/disruption" className="text-sm text-[#78716c] hover:text-[#e85d3a] transition-colors">Disruption</Link>
            <Link href="/packing" className="text-sm text-[#78716c] hover:text-[#e85d3a] transition-colors">Packing</Link>
            <Link href="/saved" className="text-sm text-[#78716c] hover:text-[#e85d3a] transition-colors">Saved trips</Link>
            <Link href="/plan">
              <button className="bg-[#e85d3a] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#d04e2d] transition-colors">
                Plan a trip
              </button>
            </Link>
          </div>

          <div className="flex sm:hidden items-center gap-3">
            <Link href="/plan">
              <button className="bg-[#e85d3a] text-white px-4 py-2 rounded-full text-sm font-semibold">Plan</button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 text-[#78716c] hover:text-[#1c1917]"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <span className="text-xl leading-none">×</span>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="block w-5 h-0.5 bg-current" />
                  <span className="block w-5 h-0.5 bg-current" />
                  <span className="block w-5 h-0.5 bg-current" />
                </span>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 bg-[#fffbf7] border-b border-[#e8e4e0] shadow-sm z-50 px-6 py-4 flex flex-col gap-4">
            <Link href="/research" onClick={() => setMobileMenuOpen(false)} className="text-sm text-[#1c1917] hover:text-[#e85d3a]">Research</Link>
            <Link href="/disruption" onClick={() => setMobileMenuOpen(false)} className="text-sm text-[#1c1917] hover:text-[#e85d3a]">Disruption</Link>
            <Link href="/packing" onClick={() => setMobileMenuOpen(false)} className="text-sm text-[#1c1917] hover:text-[#e85d3a]">Packing List</Link>
            <Link href="/saved" onClick={() => setMobileMenuOpen(false)} className="text-sm text-[#1c1917] hover:text-[#e85d3a]">Saved Trips</Link>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <p className="text-xs font-bold text-[#e85d3a] uppercase tracking-[0.18em] mb-6">
            Powered by 7 AI agents
          </p>
          <h1 className="text-5xl md:text-7xl font-bold text-[#1c1917] leading-[1.05] tracking-tight mb-8">
            Where to<br />next?
          </h1>

          {/* Search bar */}
          <div className="flex max-w-xl mx-auto mb-6 shadow-[0_4px_28px_rgba(0,0,0,0.09)] rounded-2xl overflow-hidden border border-[#e8e4e0] bg-white">
            <input
              type="text"
              placeholder="Japan, Portugal, Bali..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-6 py-4 text-[15px] text-[#1c1917] placeholder:text-[#a8a29e] outline-none bg-transparent"
            />
            <button
              onClick={() => handleSearch()}
              className="bg-[#e85d3a] text-white px-6 py-4 font-semibold hover:bg-[#d04e2d] transition-colors whitespace-nowrap text-sm"
            >
              Plan trip →
            </button>
          </div>

          {/* Quick destinations */}
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_DESTINATIONS.map(({ flag, name }) => (
              <button
                key={name}
                onClick={() => handleSearch(name)}
                className="px-4 py-2 rounded-full border border-[#e8e4e0] bg-white text-sm text-[#78716c] hover:border-[#e85d3a] hover:text-[#e85d3a] transition-colors"
              >
                {flag} {name}
              </button>
            ))}
          </div>
        </section>

        {/* Stats bar */}
        <div className="border-y border-[#e8e4e0] bg-white py-5 px-6">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-[#78716c]">
            {[
              { icon: "🤖", label: "7 specialized AI agents" },
              { icon: "⚡", label: "Plan in under 2 minutes" },
              { icon: "🌍", label: "Any destination worldwide" },
              { icon: "✓", label: "Free · no signup needed" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-bold text-[#e85d3a] uppercase tracking-[0.18em] mb-4">How it works</p>
            <h2 className="text-center text-3xl font-bold text-[#1c1917] mb-12">
              From idea to plan in 3 steps
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div key={step.title} className="bg-white rounded-2xl p-8 border border-[#e8e4e0]">
                  <div className="w-10 h-10 rounded-xl bg-[#fdf0ec] flex items-center justify-center text-[#e85d3a] font-bold text-sm mb-5">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-[#1c1917] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#78716c] leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agent grid */}
        <section className="bg-white border-y border-[#e8e4e0] py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-bold text-[#e85d3a] uppercase tracking-[0.18em] mb-4">Under the hood</p>
            <h2 className="text-center text-3xl font-bold text-[#1c1917] mb-4">
              7 agents. One perfect trip.
            </h2>
            <p className="text-center text-[#78716c] mb-12 max-w-lg mx-auto text-sm leading-relaxed">
              Specialized AI agents work in parallel — each an expert in its own domain.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="rounded-2xl border border-[#e8e4e0] p-5 hover:border-[#e85d3a] hover:bg-[#fdf0ec]/50 transition-colors"
                >
                  <span className="text-2xl mb-3 block">{agent.icon}</span>
                  <h3 className="font-semibold text-[#1c1917] text-sm mb-1">{agent.name}</h3>
                  <p className="text-xs text-[#78716c] leading-relaxed">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#e85d3a] py-20 px-6 text-center">
          <p className="text-[#fbe1d9] text-xs font-bold uppercase tracking-[0.18em] mb-5">Ready to go?</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
            Your next adventure<br />starts here.
          </h2>
          <p className="text-[#fbe1d9] mb-10 text-base max-w-sm mx-auto leading-relaxed">
            Tell us where — the AI does the rest.
          </p>
          <Link href="/plan">
            <button className="bg-white text-[#e85d3a] px-8 py-4 rounded-full font-bold hover:bg-[#fff5f2] transition-colors text-base shadow-sm">
              Plan for free →
            </button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-[#e8e4e0] py-8 px-6 text-center text-sm text-[#a8a29e] bg-[#fffbf7]">
        <div className="flex items-center justify-center gap-2">
          <span>✈</span>
          <span>TravelAgent — AI Travel Planning</span>
        </div>
      </footer>
    </div>
  );
}

const QUICK_DESTINATIONS = [
  { flag: "🗾", name: "Japan" },
  { flag: "🇵🇹", name: "Portugal" },
  { flag: "🇲🇦", name: "Morocco" },
  { flag: "🏝️", name: "Bali" },
  { flag: "🇬🇷", name: "Greece" },
  { flag: "🇮🇹", name: "Italy" },
];

const STEPS = [
  {
    title: "Tell us where",
    description: "Destination, dates, travelers, interests and budget — done in a few clicks.",
  },
  {
    title: "AI agents search",
    description: "7 specialized agents search simultaneously for the best flights, hotels and activities.",
  },
  {
    title: "Get your plan",
    description: "You receive a complete travel proposal — customizable to your exact needs.",
  },
];

const AGENTS = [
  { icon: "✈️", name: "Flight Agent", description: "Best flights, cheap stopovers, optimal times." },
  { icon: "🏨", name: "Hotel Agent", description: "Prime location, best price-performance ratio." },
  { icon: "🗺️", name: "Activity Agent", description: "Culture, adventure, restaurants, day planning." },
  { icon: "💰", name: "Budget Agent", description: "Optimize total costs, find alternatives." },
  { icon: "🔍", name: "Research Agent", description: "Visa, climate, safety, local tips — all before booking." },
  { icon: "🚨", name: "Disruption Agent", description: "Flight disrupted? Status, alternatives and rights in seconds." },
  { icon: "🎒", name: "Packing Agent", description: "Destination-specific packing list tailored to climate and trip type." },
  { icon: "📋", name: "Briefing Agent", description: "Full country briefing: culture, currency, health, safety." },
];
