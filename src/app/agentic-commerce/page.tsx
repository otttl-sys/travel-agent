import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Agentic Commerce — How This Project Works | TravelAgent",
  description:
    "How TravelAgent maps onto the gen AI → agentic AI → agentic commerce continuum, and what the MCP server demonstrates about agentic travel infrastructure.",
};

export default function AgenticCommercePage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#e5e2dc] px-6 py-5 bg-[#faf9f6]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-[#1a1a1a] text-base tracking-[0.2em] uppercase">TravelAgent</Link>
          <Link href="/plan">
            <button className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-[#e85d3a] transition-colors">
              Plan a trip
            </button>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-24 px-6 overflow-hidden border-b border-[#e5e2dc]">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em] mb-5">
              Under the hood
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-[#1a1a1a] tracking-[-0.03em] leading-[1.05] mb-6">
              From search to sale: where this project sits on the agentic commerce map
            </h1>
            <p className="text-[#57534e] text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Travel is moving from AI that <em>recommends</em> to AI that <em>executes</em> — researching,
              booking and paying on a traveler&apos;s behalf. This page explains how TravelAgent fits into
              that shift, what it already demonstrates, and what a production version would need.
            </p>
          </div>
        </section>

        {/* The continuum */}
        <section className="py-24 px-6 bg-white border-b border-[#e5e2dc]">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em] mb-4">The continuum</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-[#1a1a1a] tracking-[-0.03em] mb-4 max-w-2xl">
              Gen AI → agentic AI → agentic commerce
            </h2>
            <p className="text-[#57534e] mb-12 max-w-2xl text-sm leading-relaxed">
              Per PhocusWire&apos;s 2026 industry framing (sponsored by PayPal, with Sabre and Mindtrip cited
              as the leading example), AI in travel sits on a continuum. Each stage builds on the last.
            </p>

            <div className="grid md:grid-cols-3 divide-y divide-x-0 md:divide-y-0 md:divide-x divide-[#e5e2dc] border-y border-[#e5e2dc]">
              {CONTINUUM.map((stage) => (
                <div key={stage.title} className="p-8">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8a29e] mb-3">
                    {stage.tag}
                  </span>
                  <h3 className="font-heading font-extrabold text-[#1a1a1a] text-xl mb-3 tracking-[-0.02em]">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-[#57534e] leading-relaxed mb-4">{stage.description}</p>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${stage.badgeClass}`}>
                    {stage.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mindtrip inspiration */}
        <section className="py-24 px-6 border-b border-[#e5e2dc]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em] mb-4">Reference flow</p>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-[#1a1a1a] tracking-[-0.03em] mb-6">
                What Mindtrip + Sabre + PayPal got right
              </h2>
              <p className="text-sm text-[#57534e] leading-relaxed mb-6">
                In a June 2026 webinar, Mindtrip demonstrated an end-to-end agentic flight booking flow —
                chat-first search, transparent reasoning, and a checkout backed by Sabre (shopping/pricing)
                and PayPal (identity + payment). Four patterns from that flow are already reflected here:
              </p>
              <ul className="space-y-4">
                {MINDTRIP_PATTERNS.map((p) => (
                  <li key={p.title} className="flex gap-4">
                    <span className="text-2xl leading-none shrink-0">{p.icon}</span>
                    <div>
                      <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">{p.title}</h3>
                      <p className="text-xs text-[#78716c] leading-relaxed">{p.description}</p>
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
        <section className="py-24 px-6 bg-white border-b border-[#e5e2dc]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em] mb-4">Working example</p>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-[#1a1a1a] tracking-[-0.03em] mb-6">
                The MCP server: a small standalone agentic AI travel assistant
              </h2>
              <p className="text-sm text-[#57534e] leading-relaxed mb-4">
                The whitepaper highlights &quot;standalone agentic AI travel assistants&quot; — separate
                from a website&apos;s own chat — as an emerging surface for agentic commerce. The{" "}
                <code className="text-xs bg-[#f5f0eb] px-1.5 py-0.5 rounded">travel-agent-db</code> MCP
                server is exactly that pattern at small scale: it exposes saved trips and price watches
                directly to any MCP-compatible AI client (e.g. Claude), so an assistant can list, search,
                inspect and manage a traveler&apos;s trips without going through the website&apos;s UI at all.
              </p>
              <p className="text-sm text-[#57534e] leading-relaxed">
                That&apos;s the same underlying idea as Google&apos;s WebMCP and the Sabre/Mindtrip/PayPal
                integration — a protocol-level &quot;hidden highway&quot; between an AI agent and a
                merchant&apos;s backend — just scoped to a hobby project instead of an airline&apos;s
                reservation system.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8a29e] mb-4">
                travel-agent-db · 5 tools
              </p>
              <div className="space-y-3">
                {MCP_TOOLS.map((t) => (
                  <div key={t.name} className="flex items-start gap-3 rounded-lg bg-white border border-[#e5e2dc] px-4 py-3">
                    <span className="text-base leading-none shrink-0 mt-0.5">{t.icon}</span>
                    <div>
                      <code className="text-xs font-semibold text-[#1a1a1a]">{t.name}</code>
                      <p className="text-xs text-[#78716c] mt-0.5">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What a production version would need */}
        <section className="py-24 px-6 border-b border-[#e5e2dc]">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-[#e85d3a] uppercase tracking-[0.28em] mb-4">Honest scope</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-[#1a1a1a] tracking-[-0.03em] mb-4 max-w-2xl">
              What's deliberately out of scope — and why
            </h2>
            <p className="text-[#57534e] mb-12 max-w-2xl text-sm leading-relaxed">
              The whitepaper frames five infrastructure paths for agentic commerce, from building everything
              in-house to adopting an end-to-end platform. TravelAgent is a deliberately small, transparent
              version of <strong>Option 1 (build in-house)</strong> — useful for demonstrating the patterns,
              not for handling real payments.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e2dc] border border-[#e5e2dc]">
              {SCOPE_ITEMS.map((item) => (
                <div key={item.title} className="bg-[#faf9f6] p-6">
                  <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1.5">{item.title}</h3>
                  <p className="text-xs text-[#78716c] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center">
          <p className="text-[#57534e] text-base mb-8 max-w-md mx-auto">
            See the agent trace, transparent reasoning, and trip planning flow in action.
          </p>
          <Link href="/plan">
            <button className="bg-[#1a1a1a] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#e85d3a] transition-colors text-xs uppercase tracking-[0.2em]">
              Try the planner →
            </button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-[#e5e2dc] bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center text-xs text-[#a8a29e]">
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
    badgeClass: "bg-[#eef7ee] text-[#2f6e3a]",
  },
  {
    tag: "Stage 2",
    title: "Agentic AI",
    description:
      "Agents execute multi-step tasks autonomously: searching flights and hotels in parallel, optimizing budgets, replanning when something changes — with a human in the loop.",
    status: "Implemented (8 agents)",
    badgeClass: "bg-[#eef7ee] text-[#2f6e3a]",
  },
  {
    tag: "Stage 3",
    title: "Agentic commerce",
    description:
      "Agents research, negotiate and complete transactions — booking and paying — on the traveler's behalf, via providers like Sabre (shopping/pricing) and PayPal (identity/checkout).",
    status: "Out of scope (by design)",
    badgeClass: "bg-[#faf1ea] text-[#b1502f]",
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
