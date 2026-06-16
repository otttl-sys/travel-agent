import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export const metadata = {
  title: "About — Inspiration & How It Works",
  description:
    "What inspired this project, which patterns we borrowed from Mindtrip, Sabre and PayPal, and where AI-powered travel planning is heading.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav containerClassName="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/plan">
          <button className="bg-foreground text-background px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold hover:bg-brand hover:text-brand-foreground transition-colors">
            Plan a trip
          </button>
        </Link>
      </SiteNav>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 px-6 border-b border-border">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-5">
              About this project
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-foreground tracking-[-0.03em] leading-[1.05] mb-6">
              Built on shoulders of giants
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              An AI-native travel planner built to explore what happens when 8 specialized agents
              replace a search form — and what the industry leaders that came before us got right.
            </p>
          </div>
        </section>

        {/* Inspiration — Reference Flow */}
        <section className="py-24 px-6 border-b border-border">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Where we got inspired</p>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-6">
                What Mindtrip + Sabre + PayPal got right
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                In a June 2026 webinar, Mindtrip demonstrated an end-to-end agentic flight booking flow —
                chat-first search, transparent reasoning, and a checkout backed by Sabre (shopping/pricing)
                and PayPal (identity + payment). Four patterns from that flow shaped how we built this:
              </p>
              <ul className="space-y-6">
                {MINDTRIP_PATTERNS.map((p) => (
                  <li key={p.title} className="flex gap-4">
                    <span className="text-2xl leading-none shrink-0 mt-0.5">{p.icon}</span>
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
                alt="Conversational trip planning"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* Also inspired by */}
        <section className="py-24 px-6 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Also inspired by</p>
            <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-12">
              The tools and players we learned from
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {INSPIRATIONS.map((item) => (
                <div key={item.name} className="bg-background p-6">
                  <p className="font-semibold text-foreground text-sm mb-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.lesson}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The AI continuum */}
        <section className="py-24 px-6 border-b border-border">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Where we sit</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-4 max-w-2xl">
              Gen AI → Agentic AI → Agentic commerce
            </h2>
            <p className="text-muted-foreground mb-12 max-w-2xl text-sm leading-relaxed">
              Travel AI is moving from recommendations to execution. Here&apos;s where this project sits on that continuum.
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

        {/* The 8 agents */}
        <section className="py-24 px-6 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Under the hood</p>
            <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-12">
              8 agents. One perfect trip.
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y divide-x-0 lg:divide-y-0 lg:divide-x divide-border border-y border-border">
              {AGENTS.map((agent) => (
                <div key={agent.name} className="p-6 bg-background hover:bg-brand-subtle transition-colors">
                  <span className="text-2xl mb-4 block">{agent.icon}</span>
                  <h3 className="font-semibold text-foreground text-sm mb-1.5">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center">
          <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-5">Try it yourself</p>
          <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-[-0.03em] mb-6">
            From idea to plan in minutes.
          </h2>
          <Link href="/plan">
            <button className="bg-foreground text-background px-8 py-4 rounded-full font-semibold hover:bg-brand hover:text-brand-foreground transition-colors text-xs uppercase tracking-[0.2em]">
              Plan a trip →
            </button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-muted-foreground">
          Built with Claude · Inspired by Mindtrip, Sabre &amp; PayPal
        </div>
      </footer>
    </div>
  );
}

const MINDTRIP_PATTERNS = [
  {
    icon: "💬",
    title: "Chat-first entry, no rigid form",
    description:
      "A single natural-language input replaces multi-field search forms — reflected in the home page search bar and the concierge chat.",
  },
  {
    icon: "🔎",
    title: "Transparent agent reasoning",
    description:
      "Live trace of which agent is working, on what, and whether it's done — visible in the agent trace panel during planning.",
  },
  {
    icon: "🧭",
    title: "Narrative results, not just a grid",
    description:
      "Results come with a written rationale alongside structured comparisons — not just a table of prices.",
  },
  {
    icon: "🗂️",
    title: "Trip as the central object",
    description:
      "Saved trips, price watches and itineraries are organized around a persistent trip record rather than one-off searches.",
  },
];

const INSPIRATIONS = [
  {
    name: "Google Flights",
    lesson: "Price transparency and date-flexibility as core UX — not buried in filters.",
  },
  {
    name: "Kayak Explore",
    lesson: "Destination-agnostic search: 'show me anywhere warm for under €1,500' as a first-class query.",
  },
  {
    name: "Airbnb",
    lesson: "Emotional destination cards with photography-led UI instead of data-dense tables.",
  },
  {
    name: "GetYourGuide",
    lesson: "Activities as a first-class travel product — not an afterthought appended to flights/hotels.",
  },
  {
    name: "Rome2rio",
    lesson: "Multi-modal route transparency: show all options (fly, train, bus, drive) side by side.",
  },
  {
    name: "Sherpa°",
    lesson: "Visa and entry requirements as structured, always-verified data — not scraped or hallucinated.",
  },
];

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
      "Agents execute multi-step tasks autonomously: searching flights and hotels in parallel, optimizing budgets, replanning when something changes.",
    status: "Implemented (8 agents)",
    badgeClass: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
  },
  {
    tag: "Stage 3",
    title: "Agentic commerce",
    description:
      "Agents research, negotiate and complete transactions — booking and paying — on the traveler's behalf, via providers like Sabre and PayPal.",
    status: "Out of scope (by design)",
    badgeClass: "bg-brand-subtle text-brand",
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
