"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia",
  "Brazil", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland",
  "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kosovo", "Kuwait", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg", "Malaysia",
  "Malta", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Nepal",
  "Netherlands", "New Zealand", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen",
  "Zimbabwe",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [passportCountry, setPassportCountry] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCountries = countryQuery.length >= 1
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(countryQuery.toLowerCase())).slice(0, 6)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passportCountry || !homeCity.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passport_country: passportCountry, home_city: homeCity.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Something went wrong.");
      return;
    }
    router.push("/saved");
  }

  function handleSkip() {
    router.push("/saved");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">
              Welcome to Vagamundo
            </p>
            <h1 className="text-3xl font-heading font-extrabold tracking-[-0.03em] text-foreground mb-2">
              Quick setup
            </h1>
            <p className="text-muted-foreground text-sm">
              Tell us two things so we can personalise your trips — visa checks and suggested departure city will work automatically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-8 space-y-6">
            {/* Passport country */}
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
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Type your country…"
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {filteredCountries.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                      {filteredCountries.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setPassportCountry(c); setCountryQuery(""); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Home city */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Home city (your usual departure city)
              </label>
              <Input
                placeholder="e.g. Berlin, London, New York…"
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={saving || !passportCountry || !homeCity.trim()}
                className="w-full bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
              >
                {saving ? "Saving…" : "Save and continue →"}
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Skip for now
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to Vagamundo
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
