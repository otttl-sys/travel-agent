"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import type { DiscoverCard } from "@/app/api/discover/route";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const INTERESTS = [
  { id: "culture", label: "Culture", icon: "🏛️" },
  { id: "nature", label: "Nature", icon: "🏔️" },
  { id: "beach", label: "Beach", icon: "🏄" },
  { id: "city", label: "City break", icon: "🌆" },
  { id: "adventure", label: "Adventure", icon: "🪂" },
  { id: "food", label: "Food", icon: "🍜" },
  { id: "luxury", label: "Luxury", icon: "💎" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
  { id: "family", label: "Family", icon: "🎡" },
  { id: "nightlife", label: "Nightlife", icon: "🎭" },
];

const BUDGET_TIERS = [
  { id: "ultra-budget", label: "Ultra-budget", sub: "< €600 / person" },
  { id: "budget", label: "Budget", sub: "€600–€1 200" },
  { id: "balanced", label: "Balanced", sub: "€1 200–€2 500" },
  { id: "premium", label: "Premium", sub: "€2 500–€5 000" },
  { id: "luxury", label: "Luxury", sub: "> €5 000" },
];

function currentMonth(): string {
  return MONTHS[new Date().getMonth()];
}

export default function DiscoverPage() {
  const router = useRouter();

  const [month, setMonth] = useState(currentMonth());
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<DiscoverCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleDiscover() {
    setLoading(true);
    setCards(null);
    setError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, interests, budget }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCards(data.destinations ?? []);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function planTrip(destination: string) {
    const params = new URLSearchParams({ destination });
    router.push(`/plan?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav containerClassName="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/plan" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
          Plan a trip
        </Link>
      </SiteNav>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">
            Seasonal discovery
          </p>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-4">
            Where should I go?
          </h1>
          <p className="text-muted-foreground text-base max-w-lg">
            Pick a month, your interests and budget — the AI finds 5 destinations
            that are at their absolute best right then.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-10 mb-12">
          {/* Month */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              When are you traveling?
            </h2>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    month === m
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              What are you into?{" "}
              <span className="normal-case font-normal text-muted-foreground/70">
                (optional — pick any)
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    interests.includes(item.id)
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Budget per person (7 nights, incl. flights)
            </h2>
            <div className="flex flex-wrap gap-2">
              {BUDGET_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setBudget(tier.id)}
                  className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-colors ${
                    budget === tier.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-sm font-semibold">{tier.label}</span>
                  <span className={`text-xs mt-0.5 ${budget === tier.id ? "text-background/70" : "text-muted-foreground/70"}`}>
                    {tier.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleDiscover}
          disabled={loading}
          className="bg-foreground text-background px-8 py-4 rounded-full font-semibold hover:bg-brand hover:text-brand-foreground transition-colors text-sm uppercase tracking-[0.18em] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Finding destinations…" : `Find destinations for ${month} →`}
        </button>

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border overflow-hidden animate-pulse"
              >
                <div className="h-32 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-10 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {cards && cards.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-heading font-extrabold text-foreground tracking-[-0.02em] mb-8">
              5 destinations perfect for {month}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => (
                <DiscoverCardUI
                  key={card.id}
                  card={card}
                  onPlan={() => planTrip(card.destination)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DiscoverCardUI({
  card,
  onPlan,
}: {
  card: DiscoverCard;
  onPlan: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${card.gradient} p-6 flex items-end justify-between`}>
        <div>
          <span className="text-3xl">{card.emoji}</span>
          <h3 className="text-white font-heading font-extrabold text-xl tracking-[-0.02em] mt-2">
            {card.destination}
          </h3>
          <p className="text-white/80 text-xs uppercase tracking-[0.15em] mt-0.5">
            {card.country}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/90 text-xs font-semibold">
            €{card.priceFrom.toLocaleString()}–{card.priceTo.toLocaleString()}
          </p>
          <p className="text-white/70 text-[10px]">per person · 7 nights</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <p className="text-xs font-semibold text-brand uppercase tracking-[0.15em]">
          {card.tagline}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {card.whyNow}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>🌡️</span>
          {card.climate}
        </p>

        {/* Highlights toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          {expanded ? "▲ Hide highlights" : "▼ Season highlights"}
        </button>
        {expanded && (
          <ul className="space-y-1.5">
            {card.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-brand mt-0.5">✓</span>
                {h}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onPlan}
          className="mt-auto pt-2 bg-foreground text-background rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] hover:bg-brand hover:text-brand-foreground transition-colors"
        >
          Plan this trip →
        </button>
      </div>
    </div>
  );
}
