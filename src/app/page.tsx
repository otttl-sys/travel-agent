"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlaneLanding, MapPinned, Globe2, CircleDollarSign, Binoculars,
  Zap, BaggageClaim, BookOpenText, Bot, Globe, Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { DestinationScanner } from "@/components/destination-scanner";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [adventureMode, setAdventureMode] = useState(false);

  function handleSearch(dest?: string) {
    const q = dest ?? query;
    const params = new URLSearchParams();
    if (q.trim()) params.set("destination", q.trim());
    if (adventureMode) params.set("adventure", "1");
    router.push(`/plan?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 bg-background/95 backdrop-blur sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-10">
          <div className="flex items-center gap-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-[26px] h-[26px] rounded-full bg-brand flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="oklch(0.99 0 0)" stroke="none">
                  <path d="M3 11 L21 4 L14 21 L11 13 Z" />
                </svg>
              </span>
              <span className="font-heading font-semibold text-foreground text-[19px] tracking-[-0.02em]">Vagamundo</span>
            </div>
            <div className="hidden md:flex items-center gap-7">
              <Link href="/discover" className="text-[14.5px] font-medium text-muted-foreground hover:text-foreground transition-colors">Discover</Link>
              <Link href="/saved" className="text-[14.5px] font-medium text-muted-foreground hover:text-foreground transition-colors">My trips</Link>
              <a href="#how-it-works" className="text-[14.5px] font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <Link href="/explore" className="text-[14.5px] font-medium text-muted-foreground hover:text-foreground transition-colors">Explore</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-[18px]">
            <UserNav />
            <Link href="/plan">
              <button className="border-none bg-foreground text-background font-semibold text-sm px-5 py-[11px] rounded-full hover:opacity-90 transition-opacity">
                Start planning
              </button>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex md:hidden items-center gap-4">
            <ThemeToggle />
            <Link href="/plan">
              <button className="bg-brand text-brand-foreground px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-semibold whitespace-nowrap">Start planning</button>
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
            <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Chat with AI</Link>
            <Link href="/discover" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Discover</Link>
            <Link href="/explore" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Explore</Link>
            <Link href="/research" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Research</Link>
            <Link href="/budget" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Budget</Link>
            <Link href="/disruption" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Disruption</Link>
            <Link href="/packing" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Packing List</Link>
            <Link href="/saved" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">Saved Trips</Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.18em] text-foreground">About</Link>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-20 pb-3 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-micro font-bold text-brand mb-5">Eight agents · One perfect trip</p>
            <h1 className="font-heading font-normal text-foreground text-[56px] md:text-[84px] leading-[1.0] tracking-[-0.01em]">
              Where to <em className="not-italic font-heading italic text-brand">next?</em>
            </h1>
            <p className="text-lg text-muted-foreground max-w-[46ch] mx-auto mt-6 leading-relaxed">
              Describe the trip you&apos;re dreaming of. Our agents handle flights, stays, food and the fine print — and hand you a plan you can actually book.
            </p>

            {/* Prompt bar */}
            <div className="max-w-2xl mx-auto mt-9 bg-surface border border-border rounded-[20px] shadow-[0_14px_40px_-18px_rgba(80,40,20,0.25)] pl-6 pr-2.5 py-2.5 flex items-center gap-3.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3 C7 9 7 15 12 21 C17 15 17 9 12 3 Z" />
                <path d="M4 12 H20" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={adventureMode ? "Anywhere wild — or leave blank for a surprise" : "A 7-day food & wine trip through northern Portugal, mid-budget…"}
                className="flex-1 bg-transparent outline-none text-[17px] text-left text-foreground placeholder:text-muted-foreground min-w-0"
              />
              <button
                onClick={() => handleSearch()}
                className={`shrink-0 font-semibold text-[15px] px-6 py-3 rounded-[13px] flex items-center gap-2 transition-opacity whitespace-nowrap ${
                  adventureMode ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-brand text-brand-foreground hover:opacity-90"
                }`}
              >
                {adventureMode ? "Go" : "Plan it"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-5">
              {HERO_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSearch(chip.destination)}
                  className="text-[13.5px] text-muted-foreground border border-border bg-surface px-4 py-2 rounded-full hover:border-foreground hover:text-foreground transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Chat entry point */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="text-muted-foreground text-xs">or</span>
              <Link
                href={query.trim() ? `/chat?q=${encodeURIComponent(query.trim())}` : "/chat"}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs font-semibold uppercase tracking-[0.18em] transition-colors group"
              >
                <span className="w-6 h-6 rounded-full bg-surface-sunken group-hover:bg-border flex items-center justify-center transition-colors">
                  <Bot size={13} strokeWidth={1.5} />
                </span>
                Chat with AI
                <span className="opacity-60">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Tools + Quick destinations bar */}
        <div className="border-b border-border bg-background">
          {/* Scanner + Adventure toggle row */}
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <DestinationScanner
                onConfirm={(destination, interests) => {
                  const params = new URLSearchParams();
                  params.set("destination", destination);
                  if (interests.length) params.set("interests", interests.join(","));
                  if (adventureMode) params.set("adventure", "1");
                  router.push(`/plan?${params.toString()}`);
                }}
              />
              <Link
                href="/discover"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                <Globe size={13} strokeWidth={1.5} />
                <span>Where to go?</span>
              </Link>
            </div>
            <button
              onClick={() => setAdventureMode((m) => !m)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] border transition-all ${
                adventureMode
                  ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              <Zap size={13} strokeWidth={1.5} />
              <span>Adventure</span>
            </button>
          </div>
          {/* Chips */}
          <div className="px-6 pb-4 overflow-x-auto">
            <div className="max-w-7xl mx-auto flex items-center gap-3 w-max md:w-auto md:justify-center">
              {(adventureMode ? ADVENTURE_CHIPS : QUICK_DESTINATIONS).map(({ name }) => (
                <button
                  key={name}
                  onClick={() => handleSearch(name)}
                  className={`px-5 py-2 rounded-full border text-xs uppercase tracking-[0.18em] transition-colors whitespace-nowrap ${
                    adventureMode
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-border bg-surface text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Popular destinations - info cards */}
        <section className="py-24 px-6 bg-surface-sunken">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-4">Trending right now</p>
                <h2 className="text-headline font-heading font-normal text-foreground tracking-[-0.01em]">
                  Where travelers are going this spring
                </h2>
              </div>
              <Link href="/discover" className="text-sm font-semibold text-brand hover:opacity-80 transition-opacity hidden sm:block">
                Browse all destinations →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {DESTINATIONS.map((dest, i) => (
                <DestinationCard key={dest.name} dest={dest} editorsPick={i === 0} onPlan={() => handleSearch(dest.name)} />
              ))}
            </div>
          </div>
        </section>

        {/* How it works - editorial split */}
        <section id="how-it-works" className="py-24 px-6 bg-surface border-y border-border scroll-mt-20">
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
        <section className="py-14 px-6">
          <div className="max-w-7xl mx-auto rounded-3xl p-11 text-white" style={{ background: "oklch(0.18 0.008 60)" }}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-7">
              <div>
                <p className="text-micro font-bold mb-3" style={{ color: "oklch(0.78 0.12 40)" }}>The team behind every trip</p>
                <h2 className="font-heading font-normal text-[36px] leading-[1.05] tracking-[-0.01em]">
                  Eight specialists, working in parallel
                </h2>
              </div>
              <p className="max-w-[30ch] text-sm leading-relaxed text-white/60">
                Each agent owns one part of your trip and negotiates the trade-offs with the others in real time.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {AGENTS.map((agent, i) => (
                <div key={agent.name} className="bg-white/[0.06] border border-white/10 rounded-[14px] p-[18px]">
                  <div
                    className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-3"
                    style={{ background: i % 2 === 0 ? "oklch(0.65 0.19 35)" : "oklch(0.5 0.07 175)" }}
                  >
                    <agent.icon size={18} strokeWidth={1.8} className="text-white" />
                  </div>
                  <div className="font-semibold text-[15px]">{agent.name}</div>
                  <div className="text-[12.5px] text-white/50 mt-0.5">{agent.description}</div>
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
            <span className="font-bold text-foreground text-sm tracking-[0.2em] uppercase">Vagamundo</span>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">AI-powered travel planning — flights, hotels, itineraries and more, in minutes.</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Plan</span>
            <Link href="/plan" className="text-sm text-muted-foreground hover:text-foreground">New trip</Link>
            <Link href="/budget" className="text-sm text-muted-foreground hover:text-foreground">Budget checker</Link>
            <Link href="/saved" className="text-sm text-muted-foreground hover:text-foreground">Saved trips</Link>
            <Link href="/packing" className="text-sm text-muted-foreground hover:text-foreground">Packing list</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Tools</span>
            <Link href="/research" className="text-sm text-muted-foreground hover:text-foreground">Research</Link>
            <Link href="/disruption" className="text-sm text-muted-foreground hover:text-foreground">Disruption</Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">About</span>
            <span className="text-sm text-muted-foreground">8 specialized AI agents</span>
            <span className="text-sm text-muted-foreground">Free · no signup needed</span>
          </div>
        </div>
        <div className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
          Vagamundo — AI Travel Planning
        </div>
      </footer>
    </div>
  );
}

function DestinationCard({
  dest,
  editorsPick,
  onPlan,
}: {
  dest: { name: string; tag: string; desc: string; price: string; rating: string; img: string };
  editorsPick?: boolean;
  onPlan: () => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col group cursor-pointer bg-surface border border-border hover:shadow-md transition-shadow"
      onClick={onPlan}
    >
      <div className="relative h-48 overflow-hidden">
        <Image
          src={dest.img}
          alt={dest.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        {editorsPick && (
          <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-[0.12em] text-brand px-2.5 py-1 rounded-full">
            Editor&apos;s pick
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold text-foreground text-title leading-snug">{dest.name}</h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Star size={11} fill="currentColor" className="text-amber-400" />
            {dest.rating}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 mb-3.5 leading-relaxed">{dest.tag} · {dest.desc}</p>
        <div className="flex items-center justify-between pt-3.5 border-t border-border">
          <span className="text-sm font-bold text-foreground">
            {dest.price} <span className="font-normal text-xs text-muted-foreground">est.</span>
          </span>
          <span className="text-xs font-semibold text-brand">Plan trip</span>
        </div>
      </div>
    </div>
  );
}

const DESTINATIONS = [
  {
    name: "Japan",
    tag: "Asia",
    desc: "Ancient temples, neon cities, cherry blossoms and world-class food.",
    price: "€680",
    rating: "4.9",
    img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80&auto=format&fit=crop",
  },
  {
    name: "Portugal",
    tag: "Europe",
    desc: "Cobblestone villages, Atlantic surf, and the best pastéis de nata.",
    price: "€290",
    rating: "4.8",
    img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80&auto=format&fit=crop",
  },
  {
    name: "Bali",
    tag: "Indonesia",
    desc: "Rice terraces, surf breaks, temples and jungle wellness retreats.",
    price: "€520",
    rating: "4.7",
    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&auto=format&fit=crop",
  },
  {
    name: "Kenya",
    tag: "Africa",
    desc: "Big Five safaris on the Maasai Mara, Swahili coast and mountain trekking.",
    price: "€890",
    rating: "4.9",
    img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80&auto=format&fit=crop",
  },
];

const HERO_CHIPS = [
  { label: "🌸 Tokyo in cherry-blossom season", destination: "Tokyo" },
  { label: "🏝️ Greek island hop, 10 days", destination: "Greek Islands" },
  { label: "🦁 Safari + beach in Kenya", destination: "Kenya" },
  { label: "⛷️ Long weekend in the Dolomites", destination: "Dolomites" },
];

const ADVENTURE_CHIPS = [
  { name: "Patagonia" },
  { name: "Kyrgyzstan" },
  { name: "Faroe Islands" },
  { name: "Namibia" },
  { name: "Oman" },
  { name: "Mongolia" },
  { name: "Georgia" },
  { name: "Rwanda" },
  { name: "Svalbard" },
  { name: "Madagascar" },
  { name: "Bhutan" },
  { name: "Tajikistan" },
];

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

const AGENTS: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: PlaneLanding, name: "Flight Agent", description: "Best routes, cheapest windows, layover hacks." },
  { icon: MapPinned, name: "Hotel Agent", description: "Prime location, boutique finds, best price-performance." },
  { icon: Globe2, name: "Activity Agent", description: "Hidden gems, local adventures, off-beat experiences." },
  { icon: CircleDollarSign, name: "Budget Agent", description: "Squeeze every euro — finds alternatives you'd never spot." },
  { icon: Binoculars, name: "Research Agent", description: "Visa, climate, safety intel — everything before you go." },
  { icon: Zap, name: "Disruption Agent", description: "Flight chaos? Finds alternatives and your rights instantly." },
  { icon: BaggageClaim, name: "Packing Agent", description: "Smart packing list tuned to climate and trip style." },
  { icon: BookOpenText, name: "Briefing Agent", description: "Culture codes, currency, health, safety — the full picture." },
];
