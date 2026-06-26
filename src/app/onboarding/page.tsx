"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe, MapPin, Users, User, Heart, Sparkles,
  Compass, TreePine, Waves, Tent, UtensilsCrossed, Crown, Wind, Building2,
  type LucideIcon,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia",
  "Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cuba",
  "Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Estonia","Ethiopia","Finland",
  "France","Georgia","Germany","Ghana","Greece","Guatemala","Hungary","Iceland","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan",
  "Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia",
  "Malta","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Nepal",
  "Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan",
  "Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia",
  "Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland",
  "Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates",
  "United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen",
  "Zimbabwe",
];

const GROUP_TYPES: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "solo",   label: "Solo",   Icon: User },
  { id: "couple", label: "Couple", Icon: Heart },
  { id: "family", label: "Family", Icon: Users },
  { id: "group",  label: "Group",  Icon: Sparkles },
];

const TRAVEL_STYLES: { id: string; label: string }[] = [
  { id: "budget",  label: "Budget" },
  { id: "mid",     label: "Mid-range" },
  { id: "luxury",  label: "Luxury" },
];

const INTERESTS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "culture",   label: "Culture",     Icon: Compass },
  { id: "nature",    label: "Nature",      Icon: TreePine },
  { id: "beach",     label: "Beach & Sea", Icon: Waves },
  { id: "city",      label: "City Trips",  Icon: Building2 },
  { id: "adventure", label: "Adventure",   Icon: Tent },
  { id: "food",      label: "Food & Drink",Icon: UtensilsCrossed },
  { id: "luxury",    label: "Luxury",      Icon: Crown },
  { id: "wellness",  label: "Wellness",    Icon: Wind },
];

const STEPS = [
  { label: "Your profile" },
  { label: "Travel style" },
  { label: "Interests" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [passportCountry, setPassportCountry] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [countryQuery, setCountryQuery] = useState("");

  const [groupType, setGroupType] = useState("");
  const [travelStyle, setTravelStyle] = useState("");

  const [interests, setInterests] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCountries = countryQuery.length >= 1
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(countryQuery.toLowerCase())).slice(0, 6)
    : [];

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passport_country: passportCountry || null,
        home_city: homeCity.trim() || null,
        group_type: groupType || null,
        travel_style: travelStyle || null,
        interests: interests.length > 0 ? interests : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Something went wrong.");
      return;
    }
    router.push("/plan");
  }

  function handleSkip() {
    router.push("/plan");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">
              Welcome to Vagamundo
            </p>
            <h1 className="text-3xl font-heading font-extrabold tracking-[-0.03em] text-foreground mb-2">
              Quick setup
            </h1>
            <p className="text-muted-foreground text-sm">
              3 quick questions so every trip feels tailored to you.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < step ? "bg-foreground text-background" :
                  i === step ? "bg-brand text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs hidden sm:block truncate ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 transition-colors ${i < step ? "bg-foreground" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-surface border border-border rounded-2xl p-8">

            {/* STEP 1 — Profile */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0">
                    <Globe size={14} strokeWidth={1.5} className="text-background" />
                  </div>
                  <h2 className="font-semibold text-foreground">Where are you from?</h2>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Passport country
                  </label>
                  {passportCountry ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-foreground bg-foreground/5">
                      <span className="text-sm font-medium text-foreground flex-1">{passportCountry}</span>
                      <button
                        type="button"
                        onClick={() => { setPassportCountry(""); setCountryQuery(""); }}
                        className="text-muted-foreground hover:text-foreground text-lg leading-none"
                      >×</button>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Type your country…"
                        value={countryQuery}
                        onChange={(e) => setCountryQuery(e.target.value)}
                        autoComplete="off"
                        autoFocus
                      />
                      {filteredCountries.length > 0 && (
                        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                          {filteredCountries.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { setPassportCountry(c); setCountryQuery(""); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                            >{c}</button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Home city
                  </label>
                  <div className="relative">
                    <MapPin size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="e.g. Berlin, London, New York…"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setStep(1)}
                  disabled={!passportCountry || !homeCity.trim()}
                  className="w-full bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
                >
                  Continue →
                </Button>
              </div>
            )}

            {/* STEP 2 — Travel style */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0">
                    <Users size={14} strokeWidth={1.5} className="text-background" />
                  </div>
                  <h2 className="font-semibold text-foreground">How do you travel?</h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Who do you travel with?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GROUP_TYPES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setGroupType(id)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          groupType === id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:border-foreground/40"
                        }`}
                      >
                        <Icon size={15} strokeWidth={1.5} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Budget style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TRAVEL_STYLES.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTravelStyle(id)}
                        className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                          travelStyle === id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:border-foreground/40"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setStep(0)} variant="outline" className="flex-1">
                    ← Back
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!groupType || !travelStyle}
                    className="flex-1 bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 — Interests */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0">
                    <Heart size={14} strokeWidth={1.5} className="text-background" />
                  </div>
                  <h2 className="font-semibold text-foreground">What do you love?</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">Pick as many as you like.</p>

                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS.map(({ id, label, Icon }) => {
                    const selected = interests.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleInterest(id)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:border-foreground/40"
                        }`}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-2">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                    ← Back
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={saving}
                    className="flex-1 bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
                  >
                    {saving ? "Saving…" : "Start planning →"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <button
              onClick={handleSkip}
              className="hover:text-foreground transition-colors"
            >
              Skip for now →
            </button>
            {" · "}
            <Link href="/" className="hover:text-foreground transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
