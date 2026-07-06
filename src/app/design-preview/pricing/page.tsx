import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// Internal design review only — deliberately NOT linked from the real nav or /page.tsx.
// STRATEGY.md §8/D-E15: no public commercial signaling (incl. pricing pages) until the
// LHG contract ends. This route previews the Fable Pro/pricing screen without shipping it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PricingPreview() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold text-center py-2 px-4">
        Internal design preview — not linked in production, not for public release (STRATEGY.md §8)
      </div>

      <div className="flex justify-end px-6 py-3">
        <ThemeToggle />
      </div>

      <main className="flex-1">
        <section className="pt-6 pb-2 px-6 text-center">
          <p className="text-micro font-bold text-brand mb-3">Pricing</p>
          <h1 className="font-heading font-normal text-foreground text-[44px] leading-[1.05] tracking-[-0.01em]">
            Start free. Upgrade when you travel more.
          </h1>
          <p className="text-[15.5px] text-muted-foreground max-w-[48ch] mx-auto mt-4">
            No signup needed to plan your first trip. Pro unlocks the full agent team for frequent travelers.
          </p>
        </section>

        <section className="pt-10 pb-6 px-6">
          <div className="max-w-[1000px] mx-auto grid md:grid-cols-2 gap-6">
            {/* Free plan */}
            <div className="bg-surface border border-border rounded-[22px] p-8 flex flex-col">
              <div className="font-heading font-semibold text-xl text-foreground">Free</div>
              <p className="text-sm text-muted-foreground mt-1.5 mb-6">For your next trip.</p>
              <div className="flex items-baseline gap-2 mb-7">
                <span className="font-heading text-[52px] leading-none text-foreground">€0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <div className="flex flex-col gap-3 text-[14.5px] text-foreground/80 flex-1">
                {FREE_INCLUDED.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Check size={16} strokeWidth={2.4} className="text-sage shrink-0" />
                    {f}
                  </div>
                ))}
                {FREE_EXCLUDED.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-muted-foreground/70">
                    <X size={16} strokeWidth={2.2} className="text-muted-foreground/50 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button className="mt-7 border border-border bg-surface text-foreground font-semibold text-[15px] py-3.5 rounded-[13px] hover:bg-surface-sunken transition-colors">
                Start planning — free
              </button>
            </div>

            {/* Pro plan */}
            <div
              className="relative rounded-[22px] p-8 flex flex-col text-white shadow-[0_24px_60px_-24px_rgba(60,25,10,0.5)]"
              style={{ background: "oklch(0.18 0.008 60)" }}
            >
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground text-[11px] font-bold uppercase tracking-[0.14em] px-4 py-1.5 rounded-full whitespace-nowrap">
                For frequent travelers
              </span>
              <div className="font-heading font-semibold text-xl">Pro</div>
              <p className="text-sm text-white/60 mt-1.5 mb-6">The full agent team, all year round.</p>
              <div className="flex items-baseline gap-2 mb-7">
                <span className="font-heading text-[52px] leading-none">€9</span>
                <span className="text-sm text-white/60">/ month · billed annually</span>
              </div>
              <div className="flex flex-col gap-3 text-[14.5px] text-white/90 flex-1">
                {PRO_INCLUDED.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Check size={16} strokeWidth={2.4} style={{ color: "oklch(0.78 0.12 40)" }} className="shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button className="mt-7 border-none bg-brand text-brand-foreground font-semibold text-[15px] py-3.5 rounded-[13px] hover:opacity-90 transition-opacity">
                Go Pro →
              </button>
              <div className="text-center text-xs text-white/45 mt-3">14-day free trial · cancel anytime</div>
            </div>
          </div>
        </section>

        <section className="relative mt-16 h-[420px] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1800&q=80&auto=format&fit=crop"
            alt="Adventure landscape"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 to-black/65" />
          <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-6">
            <p className="text-micro font-bold opacity-85 mb-4">Ready to go?</p>
            <h2 className="font-heading font-normal text-[52px] leading-[1.05]">
              Your next adventure<br />starts here.
            </h2>
            <p className="text-base opacity-85 mt-4 mb-7">Tell us where — the AI does the rest.</p>
            <Link href="/plan">
              <button className="bg-brand text-brand-foreground font-semibold px-8 py-4 rounded-[14px] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] hover:opacity-90 transition-opacity">
                Plan for free →
              </button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

const FREE_INCLUDED = [
  "1 active trip",
  "Flight, Hotel & Activity Agent",
  "Complete travel plan, exportable",
  "No signup required",
];

const FREE_EXCLUDED = [
  "Disruption & Research Agent",
  "Price alerts & re-planning",
];

const PRO_INCLUDED = [
  "Unlimited trips, planned in parallel",
  "All 8 agents — incl. Disruption & Research",
  "Price alerts & automatic re-planning",
  "Live support during flight disruptions, 24/7",
  "Share trips & plan together",
  "Packing & briefing dossiers as PDF",
];
