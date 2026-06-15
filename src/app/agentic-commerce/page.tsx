import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export const metadata = {
  title: "Agentic Commerce — How This Project Works | TravelAgent",
  description:
    "How TravelAgent maps onto the gen AI → agentic AI → agentic commerce continuum, and what the MCP server demonstrates about agentic travel infrastructure.",
};

export default function AgenticCommercePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <SiteNav sticky containerClassName="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/plan">
          <button className="bg-foreground text-background px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-brand hover:text-brand-foreground transition-colors">
            Plan a trip
          </button>
        </Link>
      </SiteNav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-24 px-6 overflow-hidden border-b border-border">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-5">
              Under the hood
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-foreground tracking-[-0.03em] leading-[1.05] mb-6">
              From search to sale: where this project sits on the agentic commerce map
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Travel is moving from AI that <em>recommends</em> to AI that <em>executes</em> — researching,
              booking and paying on a traveler&apos;s behalf. This page explains how TravelAgent fits into
              that shift, what it already demonstrates, and what a production version would need.
            </p>
          </div>
        </section>

        {/* The continuum */}
        <section className="py-24 px-6 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">The continuum</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-4 max-w-2xl">
              Gen AI → agentic AI → agentic commerce
            </h2>
            <p className="text-muted-foreground mb-12 max-w-2xl text-sm leading-relaxed">
              Per PhocusWire&apos;s 2026 industry framing (sponsored by PayPal, with Sabre and Mindtrip cited
              as the leading example), AI in travel sits on a continuum. Each stage builds on the last.
            </p>

            <div className="grid md:grid-cols-3 divide-y divide-x-0 md:divide-y-0 md:divide-x divide-border border-y border-border">
              {CONTINUUM.map((stage) => (
                <div key={stage.title} className="p-8">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {stage.tag}
                  </span>
                  <h3 className="font-heading font-extrabold text-foreground text-xl mb-3 tracking-[-0.02em]">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{stage.description}</p>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${stage.badgeClass}`}>
                    {stage.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mindtrip inspiration */}
        <section className="py-24 px-6 border-b border-border">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Reference flow</p>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-6">
                What Mindtrip + Sabre + PayPal got right
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                In a June 2026 webinar, Mindtrip demonstrated an end-to-end agentic flight booking flow —
                chat-first search, transparent reasoning, and a checkout backed by Sabre (shopping/pricing)
                and PayPal (identity + payment). Four patterns from that flow are already reflected here:
              </p>
              <ul className="space-y-4">
                {MINDTRIP_PATTERNS.map((p) => (
                  <li key={p.title} className="flex gap-4">
                    <span className="text-2xl leading-none shrink-0">{p.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm mb-1">{p.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80&auto=format&fit=crop"
                alt="Conversational trip planning interface"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* MCP server */}
        <section className="py-24 px-6 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Working example</p>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-6">
                The MCP server: a small standalone agentic AI travel assistant
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                The whitepaper highlights &quot;standalone agentic AI travel assistants&quot; — separate
                from a website&apos;s own chat — as an emerging surface for agentic commerce. The{" "}
                <code className="text-xs bg-brand-subtle px-1.5 py-0.5 rounded">travel-agent-db</code> MCP
                server is exactly that pattern at small scale: it exposes saved trips and price watches
                directly to any MCP-compatible AI client (e.g. Claude), so an assistant can list, search,
                inspect and manage a traveler&apos;s trips without going through the website&apos;s UI at all.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                That&apos;s the same underlying idea as Google&apos;s WebMCP and the Sabre/Mindtrip/PayPal
                integration — a protocol-level &quot;hidden highway&quot; between an AI agent and a
                merchant&apos;s backend — just scoped to a hobby project instead of an airline&apos;s
                reservation system.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                travel-agent-db · 5 tools
              </p>
              <div className="space-y-3">
                {MCP_TOOLS.map((t) => (
                  <div key={t.name} className="flex items-start gap-3 rounded-lg bg-surface border border-border px-4 py-3">
                    <span className="text-base leading-none shrink-0 mt-0.5">{t.icon}</span>
                    <div>
                      <code className="text-xs font-semibold text-foreground">{t.name}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What a production version would need */}
        <section className="py-24 px-6 border-b border-border">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Honest scope</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-4 max-w-2xl">
              What's deliberately out of scope — and why
            </h2>
            <p className="text-muted-foreground mb-12 max-w-2xl text-sm leading-relaxed">
              The whitepaper frames five infrastructure paths for agentic commerce, from building everything
              in-house to adopting an end-to-end platform. TravelAgent is a deliberately small, transparent
              version of <strong>Option 1 (build in-house)</strong> — useful for demonstrating the patterns,
              not for handling real payments.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {SCOPE_ITEMS.map((item) => (
                <div key={item.title} className="bg-background p-6">
                  <h3 className="font-semibold text-foreground text-sm mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center">
          <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto">
            See the agent trace, transparent reasoning, and trip planning flow in action.
          </p>
          <Link href="/plan">
            <button className="bg-foreground text-white px-8 py-4 rounded-full font-semibold hover:bg-brand transition-colors text-xs uppercase tracking-[0.2em]">
              Try the planner →
            </button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center text-xs text-muted-foreground">
          TravelAgent — AI Travel Planning
        </div>
      </footer>
    </div>
  );
}

const CONTINUUM = [
  {
    tag: "Stage 1",
    title: "Generative AI",
    description:
      "AI helps research, plan and decide — surfacing recommendations, drafting itineraries, answering questions. The traveler still books manually.",
    status: "Fully implemented",
    badgeClass: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
  },
  {
    tag: "Stage 2",
    title: "Agentic AI",
    description:
      "Agents execute multi-step tasks autonomously: searching flights and hotels in parallel, optimizing budgets, replanning when something changes — with a human in the loop.",
    status: "Implemented (8 agents)",
    badgeClass: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
  },
  {
    tag: "Stage 3",
    title: "Agentic commerce",
    description:
      "Agents research, negotiate and complete transactions — booking and paying — on the traveler's behalf, via providers like Sabre (shopping/pricing) and PayPal (identity/checkout).",
    status: "Out of scope (by design)",
    badgeClass: "bg-brand-subtle text-brand",
  },
];

const MINDTRIP_PATTERNS = [
  {
    icon: "💬",
    title: "Chat-first entry, no rigid form",
    description: "A single natural-language input replaces multi-field search forms — reflected in the home page search bar and concierge chat.",
  },
  {
    icon: "🔎",
    title: "Transparent agent reasoning",
    description: "Live trace of which agent is working, on what, and whether it's done — see the agent trace panel during planning.",
  },
  {
    icon: "🧭",
    title: "Narrative results, not just a grid",
    description: "Results come with a written rationale (why this flight, why this hotel) alongside structured comparisons.",
  },
  {
    icon: "🗂️",
    title: "Trip as the central object",
    description: "Saved trips, price watches and itineraries are organized around a persistent 'trip' record rather than one-off searches.",
  },
];

const MCP_TOOLS = [
  { icon: "📋", name: "list_trips", description: "List all saved trips for the traveler" },
  { icon: "🔍", name: "get_trip", description: "Retrieve full details for a single trip" },
  { icon: "🔎", name: "search_trips", description: "Search saved trips by destination, date or status" },
  { icon: "🗑️", name: "delete_trip", description: "Remove a saved trip" },
  { icon: "📉", name: "update_price_watch", description: "Update or cancel a price-watch on a trip" },
];

const SCOPE_ITEMS = [
  {
    title: "No real payments",
    description: "No PayPal/Sabre-style checkout. Booking flows end at a recommendation, not a transaction.",
  },
  {
    title: "No regulatory layer",
    description: "No identity verification, fraud detection, or compliance handling — required for real agentic commerce per the whitepaper.",
  },
  {
    title: "No commercial agreements",
    description: "No partner contracts, fraud-liability terms or data-usage agreements with airlines/hotels.",
  },
  {
    title: "Human-in-the-loop only",
    description: "Every agent output is a recommendation for the traveler to review — no autonomous spend.",
  },
  {
    title: "Single AI surface",
    description: "Runs as its own app plus an MCP server — not yet integrated into ChatGPT, Gemini or other agentic surfaces.",
  },
  {
    title: "Demonstration data",
    description: "Pricing and availability come from live searches but aren't backed by a bookable inventory or contract rates.",
  },
];
