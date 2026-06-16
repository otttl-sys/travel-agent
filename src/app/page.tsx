"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-5 bg-background/95 backdrop-blur sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-base tracking-[0.2em] uppercase">TravelAgent</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/research" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">Research</Link>
            <Link href="/disruption" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">Disruption</Link>
            <Link href="/packing" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">Packing</Link>
            <Link href="/saved" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">Saved Trips</Link>
            <Link href="/agentic-commerce" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">Agentic AI</Link>
            <Link href="/plan">
              <button className="bg-foreground text-background px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-brand transition-colors">
                Plan a trip
              </button>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle />
            <Link href="/plan">
              <button className="bg-foreground text-background px-4 py-2 rounded-full text-xs uppercase tracking-[0.18em] font-semibold">Plan</button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 text-muted-foreground hover:text-foreground"
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
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-sm z-50 px-6 py-5 flex flex-col gap-4">
            <Link href="/research" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Research</Link>
            <Link href="/disruption" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Disruption</Link>
            <Link href="/packing" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Packing List</Link>
            <Link href="/saved" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Saved Trips</Link>
            <Link href="/agentic-commerce" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Agentic AI</Link>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[80vh] min-h-[580px] w-full overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1800&q=80&auto=format&fit=crop"
            alt="Travel destination at golden hour"
            fill
            priority
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30" />

          <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-20">
            <p className="text-white/85 text-xs font-semibold uppercase tracking-[0.28em] mb-5">
              Powered by 8 AI agents
            </p>
            <h1 className="text-white text-5xl md:text-7xl font-heading font-extrabold leading-[1.04] tracking-[-0.03em] max-w-2xl mb-10">
              Where to next?
            </h1>

            {/* Search bar */}
            <div className="flex max-w-xl rounded-full overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.25)] bg-surface">
              <input
                type="text"
                placeholder="Japan, Portugal, Bali..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-6 py-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
              />
              <button
                onClick={() => handleSearch()}
                className="bg-foreground text-background px-7 py-4 font-semibold hover:bg-brand transition-colors whitespace-nowrap text-xs uppercase tracking-[0.18em]"
              >
                Plan trip →
              </button>
            </div>
          </div>
        </section>

        {/* Quick destinations */}
        <div className="border-b border-border bg-background py-5 px-6 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-3 w-max md:w-auto md:justify-center">
            {QUICK_DESTINATIONS.map(({ name }) => (
              <button
                key={name}
                onClick={() => handleSearch(name)}
                className="px-5 py-2 rounded-full border border-border bg-surface text-xs uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Popular destinations - editorial photo grid */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Where travelers go</p>
                <h2 className="text-headline font-heading font-extrabold text-foreground tracking-[-0.03em]">
                  Popular destinations
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {/* Large featured tile */}
              <button
                onClick={() => handleSearch(QUICK_DESTINATIONS[0].name)}
                className="group relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden text-left"
              >
                <Image
                  src={QUICK_DESTINATIONS[0].img}
                  alt={QUICK_DESTINATIONS[0].name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="text-white/80 text-xs uppercase tracking-[0.2em] mb-1">{QUICK_DESTINATIONS[0].tag}</p>
                  <h3 className="text-white text-2xl font-heading font-extrabold tracking-[-0.03em]">{QUICK_DESTINATIONS[0].name}</h3>
                </div>
              </button>

              {QUICK_DESTINATIONS.slice(1, 9).map((dest) => (
                <button
                  key={dest.name}
                  onClick={() => handleSearch(dest.name)}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden text-left"
                >
                  <Image
                    src={dest.img}
                    alt={dest.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <p className="text-white/80 text-[10px] uppercase tracking-[0.2em] mb-1">{dest.tag}</p>
                    <h3 className="text-white text-lg font-heading font-extrabold tracking-[-0.03em]">{dest.name}</h3>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* How it works - editorial split */}
        <section className="py-24 px-6 bg-surface border-y border-border">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden order-2 lg:order-1">
              <Image
                src="https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80&auto=format&fit=crop"
                alt="Trip planning"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">How it works</p>
              <h2 className="text-headline font-heading font-extrabold text-foreground tracking-[-0.03em] mb-10">
                From idea to plan in 3 steps
              </h2>
              <div className="space-y-8">
                {STEPS.map((step, i) => (
                  <div key={step.title} className="flex gap-5 pb-8 border-b border-border last:border-0 last:pb-0">
                    <span className="text-2xl font-bold text-muted-foreground/40 leading-none tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Agent grid */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Under the hood</p>
            <h2 className="text-headline font-heading font-extrabold text-foreground tracking-[-0.03em] mb-4">
              8 agents. One perfect trip.
            </h2>
            <p className="text-muted-foreground mb-12 max-w-lg text-sm leading-relaxed">
              Specialized AI agents work in parallel — each an expert in its own domain.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y divide-x-0 lg:divide-y-0 lg:divide-x divide-border border-y border-border">
              {AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="p-6 hover:bg-surface transition-colors"
                >
                  <span className="text-2xl mb-4 block">{agent.icon}</span>
                  <h3 className="font-semibold text-foreground text-sm mb-1.5">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-32 px-6 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=1800&q=80&auto=format&fit=crop"
            alt="Adventure landscape"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-[0.28em] mb-5">Ready to go?</p>
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-4 leading-[1.1] tracking-[-0.03em]">
              Your next adventure<br />starts here.
            </h2>
            <p className="text-white/80 mb-10 text-base max-w-sm mx-auto leading-relaxed">
              Tell us where — the AI does the rest.
            </p>
            <Link href="/plan">
              <button className="bg-surface text-foreground px-8 py-4 rounded-full font-semibold hover:bg-brand hover:text-brand-foreground transition-colors text-xs uppercase tracking-[0.2em]">
                Plan for free →
              </button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <span className="font-bold text-foreground text-sm tracking-[0.2em] uppercase">TravelAgent</span>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">AI-powered travel planning — flights, hotels, itineraries and more, in minutes.</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Plan</span>
            <Link href="/plan" className="text-sm text-muted-foreground hover:text-foreground">New trip</Link>
            <Link href="/saved" className="text-sm text-muted-foreground hover:text-foreground">Saved trips</Link>
            <Link href="/packing" className="text-sm text-muted-foreground hover:text-foreground">Packing list</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Tools</span>
            <Link href="/research" className="text-sm text-muted-foreground hover:text-foreground">Research</Link>
            <Link href="/disruption" className="text-sm text-muted-foreground hover:text-foreground">Disruption</Link>
            <Link href="/agentic-commerce" className="text-sm text-muted-foreground hover:text-foreground">Agentic AI</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">About</span>
            <span className="text-sm text-muted-foreground">8 specialized AI agents</span>
            <span className="text-sm text-muted-foreground">Free · no signup needed</span>
          </div>
        </div>
        <div className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
          TravelAgent — AI Travel Planning
        </div>
      </footer>
    </div>
  );
}

const QUICK_DESTINATIONS = [
  // Grid featured
  { name: "Japan", tag: "Asia", img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80&auto=format&fit=crop" },
  // Grid row 1–2 fillers
  { name: "Brazil", tag: "South America", img: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80&auto=format&fit=crop" },
  { name: "Italy", tag: "Europe", img: "https://images.unsplash.com/photo-1518730518541-d0843268c287?w=800&q=80&auto=format&fit=crop" },
  { name: "Kenya", tag: "Africa", img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80&auto=format&fit=crop" },
  { name: "Australia", tag: "Oceania", img: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80&auto=format&fit=crop" },
  // Grid row 3
  { name: "Dubai", tag: "Middle East", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80&auto=format&fit=crop" },
  { name: "Bali", tag: "Indonesia", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&auto=format&fit=crop" },
  { name: "Canada", tag: "North America", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop" },
  { name: "Vietnam", tag: "Asia", img: "https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=800&q=80&auto=format&fit=crop" },
  // Chips bar only
  { name: "Mexico", tag: "North America", img: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80&auto=format&fit=crop" },
  { name: "Sweden", tag: "Europe", img: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&q=80&auto=format&fit=crop" },
  { name: "Georgia", tag: "Caucasus", img: "https://images.unsplash.com/photo-1567325019710-c5c2a2c5ef4a?w=800&q=80&auto=format&fit=crop" },
  { name: "Namibia", tag: "Africa", img: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80&auto=format&fit=crop" },
  { name: "Sri Lanka", tag: "Asia", img: "https://images.unsplash.com/photo-1583087253076-4c545a0d5e3d?w=800&q=80&auto=format&fit=crop" },
  { name: "China", tag: "Asia", img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80&auto=format&fit=crop" },
  { name: "Thailand", tag: "Asia", img: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80&auto=format&fit=crop" },
  { name: "New Zealand", tag: "Oceania", img: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80&auto=format&fit=crop" },
  { name: "Tahiti", tag: "Pacific", img: "https://images.unsplash.com/photo-1559494007-e9d23f7d34b9?w=800&q=80&auto=format&fit=crop" },
  { name: "Portugal", tag: "Europe", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80&auto=format&fit=crop" },
  { name: "Egypt", tag: "Africa", img: "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=800&q=80&auto=format&fit=crop" },
  { name: "Greece", tag: "Europe", img: "https://images.unsplash.com/photo-1469796466635-455ede028aca?w=800&q=80&auto=format&fit=crop" },
];

const STEPS = [
  {
    title: "Tell us where",
    description: "Destination, dates, travelers, interests and budget — done in a few clicks.",
  },
  {
    title: "AI agents search",
    description: "8 specialized agents search simultaneously for the best flights, hotels and activities.",
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
