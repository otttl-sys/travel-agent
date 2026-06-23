"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SiteNav } from "@/components/site-nav";
import { DestinationScanner } from "@/components/destination-scanner";
import { Landmark, Mountain, Waves, Building2, Zap, UtensilsCrossed, Gem, Leaf, Baby, Music2, type LucideIcon } from "lucide-react";

const TOTAL_STEPS = 6;

const INTERESTS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "culture",   label: "Kultur & Geschichte", Icon: Landmark },
  { id: "nature",    label: "Natur & Berge",        Icon: Mountain },
  { id: "beach",     label: "Strand & Meer",        Icon: Waves },
  { id: "city",      label: "Städtetrip",           Icon: Building2 },
  { id: "adventure", label: "Abenteuer",            Icon: Zap },
  { id: "food",      label: "Kulinarik",            Icon: UtensilsCrossed },
  { id: "luxury",    label: "Luxus",                Icon: Gem },
  { id: "wellness",  label: "Wellness & Spa",       Icon: Leaf },
  { id: "family",    label: "Familie",              Icon: Baby },
  { id: "nightlife", label: "Nightlife & Events",   Icon: Music2 },
];

const DESTINATIONS = [
  "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bali", "Bangladesh", "Belgium", "Bolivia", "Bosnia", "Brazil", "Bulgaria",
  "Cambodia", "Canada", "Cape Town", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Dominican Republic",
  "Ecuador", "Egypt", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France", "French Polynesia",
  "Galápagos Islands", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
  "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lithuania",
  "Madagascar", "Malaysia", "Maldives", "Malta", "Mauritius", "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "North Macedonia", "Norway",
  "Oman",
  "Panama", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan",
  "Vietnam",
  "Zambia", "Zimbabwe",
  // Popular cities
  "Amalfi Coast", "Amsterdam", "Athens", "Auckland",
  "Bali", "Bangkok", "Barcelona", "Beijing", "Berlin", "Brussels", "Budapest", "Buenos Aires",
  "Cairo", "Cape Town", "Chiang Mai", "Copenhagen", "Cartagena",
  "Dubai", "Dublin",
  "Florence",
  "Havana", "Ho Chi Minh City",
  "Istanbul",
  "Jaipur",
  "Kathmandu", "Krakow", "Kuala Lumpur", "Kyoto",
  "Lisbon", "Ljubljana", "London", "Luang Prabang",
  "Machu Picchu", "Madrid", "Marrakech", "Medellín", "Miami", "Milan", "Mumbai", "Munich", "Mykonos",
  "Naples", "New York",
  "Oslo",
  "Patagonia", "Paris", "Penang", "Phnom Penh", "Porto", "Prague",
  "Queenstown",
  "Reykjavik", "Rio de Janeiro", "Rome",
  "Santorini", "Seoul", "Shanghai", "Stockholm", "Sydney",
  "Taipei", "Tokyo",
  "Valencia", "Venice", "Vienna", "Vilnius",
  "Warsaw",
  "Zanzibar", "Zurich",
].sort((a, b) => a.localeCompare(b));

type CityStop = { city: string; days: number };

type FormData = {
  isMultiCity: boolean;
  destination: string;
  origin: string;
  cities: CityStop[];
  startDate: string;
  endDate: string;
  travelers: number;
  interests: string[];
  budget: number;
  budgetMode: "with-flights" | "activities-only";
  adventureMode: boolean;
};

function lsLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSave(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted flex items-center justify-center"><p className="text-muted-foreground">Lädt...</p></div>}>
      <PlanContent />
    </Suspense>
  );
}

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(() => {
    const isAdventure = searchParams.get("adventure") === "1";
    const urlInterests = searchParams.get("interests")?.split(",").filter(Boolean) ?? [];
    const adventureDefaults = isAdventure ? ["adventure", "nature"] : [];
    const mergedInterests = [...new Set([...urlInterests, ...adventureDefaults])];
    return {
      isMultiCity: false,
      destination: searchParams.get("destination") || "",
      origin: lsLoad("vagamundo_origin", ""),
      cities: [
        { city: searchParams.get("destination") || "", days: 3 },
        { city: "", days: 3 },
        { city: "", days: 3 },
      ],
      startDate: lsLoad("vagamundo_startDate", ""),
      endDate: lsLoad("vagamundo_endDate", ""),
      travelers: lsLoad("vagamundo_travelers", 2),
      interests: mergedInterests.length > 0 ? mergedInterests : lsLoad("vagamundo_interests", []),
      budget: 3000,
      budgetMode: "with-flights",
      adventureMode: isAdventure,
    };
  });

  useEffect(() => { lsSave("vagamundo_origin", form.origin); }, [form.origin]);
  useEffect(() => { lsSave("vagamundo_startDate", form.startDate); }, [form.startDate]);
  useEffect(() => { lsSave("vagamundo_endDate", form.endDate); }, [form.endDate]);
  useEffect(() => { lsSave("vagamundo_travelers", form.travelers); }, [form.travelers]);
  useEffect(() => { lsSave("vagamundo_interests", form.interests); }, [form.interests]);

  function nextStep() { if (step < TOTAL_STEPS) setStep((s) => s + 1); }
  function prevStep() { if (step > 1) setStep((s) => s - 1); }

  function handleScanDetected(destination: string, interests: string[]) {
    setForm((f) => ({
      ...f,
      destination,
      // Merge detected interests with any already picked — don't override
      interests: [...new Set([...f.interests, ...interests])],
    }));
  }

  function toggleInterest(id: string) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((i) => i !== id)
        : [...f.interests, id],
    }));
  }

  function handleSubmit() {
    const base = {
      startDate: form.startDate,
      endDate: form.endDate,
      travelers: String(form.travelers),
      interests: form.interests.join(","),
      budget: String(form.budget),
      origin: form.origin,
      budgetMode: form.budgetMode,
      ...(form.adventureMode ? { adventure: "1" } : {}),
    };
    if (form.isMultiCity) {
      const validCities = form.cities.filter((c) => c.city.trim());
      const params = new URLSearchParams({
        ...base,
        multiCity: "1",
        cities: validCities.map((c) => c.city).join(","),
        cityDays: validCities.map((c) => c.days).join(","),
      });
      router.push(`/results?${params.toString()}`);
    } else {
      const params = new URLSearchParams({ ...base, destination: form.destination });
      router.push(`/results?${params.toString()}`);
    }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav containerClassName="max-w-xl mx-auto flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Schritt {step} von {TOTAL_STEPS}
        </span>
      </SiteNav>

      <div className="bg-background border-b border-border px-6 py-3">
        <div className="max-w-xl mx-auto">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {form.adventureMode && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40 px-6 py-2.5">
          <div className="max-w-xl mx-auto flex items-center gap-2">
            <span>⚡</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Adventure Mode — off the beaten path, raw experiences
            </span>
          </div>
        </div>
      )}
      {form.interests.includes("family") && (
        <div className="bg-teal-50 dark:bg-teal-950/20 border-b border-teal-200 dark:border-teal-800/40 px-6 py-2.5">
          <div className="max-w-xl mx-auto flex items-center gap-2">
            <span>🎡</span>
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Family Mode — kid-friendly activities & family pricing
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 sm:p-8">
            {step === 1 && (
              <StepDestination
                isMultiCity={form.isMultiCity}
                onToggleMode={() => setForm((f) => ({ ...f, isMultiCity: !f.isMultiCity }))}
                value={form.destination}
                onChange={(v) => setForm((f) => ({ ...f, destination: v }))}
                origin={form.origin}
                onOriginChange={(v) => setForm((f) => ({ ...f, origin: v }))}
                cities={form.cities}
                onCitiesChange={(cities) => setForm((f) => ({ ...f, cities }))}
                onScanDetected={handleScanDetected}
              />
            )}
            {step === 2 && (
              <StepDates
                startDate={form.startDate}
                endDate={form.endDate}
                onChangeStart={(v) => setForm((f) => ({ ...f, startDate: v }))}
                onChangeEnd={(v) => setForm((f) => ({ ...f, endDate: v }))}
              />
            )}
            {step === 3 && (
              <StepTravelers
                value={form.travelers}
                onChange={(v) => setForm((f) => ({ ...f, travelers: v }))}
              />
            )}
            {step === 4 && (
              <StepInterests
                selected={form.interests}
                onToggle={toggleInterest}
              />
            )}
            {step === 5 && (
              <StepBudget
                value={form.budget}
                budgetMode={form.budgetMode}
                onChange={(v) => setForm((f) => ({ ...f, budget: v }))}
                onModeChange={(v) => setForm((f) => ({ ...f, budgetMode: v }))}
              />
            )}
            {step === 6 && <StepSummary form={form} />}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  ← Zurück
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button
                  onClick={nextStep}
                  className="flex-1"
                  disabled={
                    step === 1 &&
                    (form.isMultiCity
                      ? form.cities.filter((c) => c.city.trim()).length < 2
                      : !form.destination.trim())
                  }
                >
                  Weiter →
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="flex-1 bg-foreground text-background hover:bg-brand hover:text-brand-foreground">
                  AI starten →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  function update(v: string) {
    onChange(v);
    if (v.length >= 2) {
      const lower = v.toLowerCase();
      const matches = DESTINATIONS.filter((d) => d.toLowerCase().includes(lower)).slice(0, 6);
      setSuggestions(matches);
      setOpen(matches.length > 0);
    } else {
      setOpen(false);
    }
    setActiveIdx(-1);
  }

  function select(s: string) {
    onChange(s);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0 && value.length >= 2) setOpen(true); }}
        className="text-base py-5"
        autoFocus={autoFocus}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                i === activeIdx ? "bg-brand-subtle text-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepDestination({
  isMultiCity,
  onToggleMode,
  value,
  onChange,
  origin,
  onOriginChange,
  cities,
  onCitiesChange,
  onScanDetected,
}: {
  isMultiCity: boolean;
  onToggleMode: () => void;
  value: string;
  onChange: (v: string) => void;
  origin: string;
  onOriginChange: (v: string) => void;
  cities: CityStop[];
  onCitiesChange: (cities: CityStop[]) => void;
  onScanDetected?: (destination: string, interests: string[]) => void;
}) {
  function updateCity(index: number, city: string) {
    onCitiesChange(cities.map((c, i) => (i === index ? { ...c, city } : c)));
  }
  function updateDays(index: number, days: number) {
    onCitiesChange(cities.map((c, i) => (i === index ? { ...c, days } : c)));
  }
  function addCity() {
    if (cities.length < 5) onCitiesChange([...cities, { city: "", days: 3 }]);
  }
  function removeCity(index: number) {
    if (cities.length > 2) onCitiesChange(cities.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 1</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-4">Wohin soll die Reise gehen?</h2>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { if (isMultiCity) onToggleMode(); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            !isMultiCity
              ? "bg-foreground text-background border-foreground"
              : "bg-surface text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          Ein Ziel
        </button>
        <button
          onClick={() => { if (!isMultiCity) onToggleMode(); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            isMultiCity
              ? "bg-foreground text-background border-foreground"
              : "bg-surface text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          Multi-City Tour
        </button>
      </div>

      {/* Departure city */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Von wo fliegst du ab?
        </label>
        <AutocompleteInput
          placeholder="z.B. Berlin, Munich, Frankfurt..."
          value={origin}
          onChange={onOriginChange}
        />
      </div>

      {!isMultiCity ? (
        <>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Reiseziel
          </label>
          <p className="text-muted-foreground text-sm mb-3">Land, Stadt oder Region — auch &quot;Irgendwo warm&quot; funktioniert.</p>
          <AutocompleteInput
            placeholder="z.B. Japan, Portugal, Bali..."
            value={value}
            onChange={onChange}
            autoFocus
          />
          <div className="mt-3">
            <DestinationScanner
              compact
              onConfirm={(dest, interests) => {
                onChange(dest);
                onScanDetected?.(dest, interests);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {["Japan", "Portugal", "Costa Rica", "Griechenland", "Marokko"].map((dest) => (
              <button
                key={dest}
                onClick={() => onChange(dest)}
                className="px-3 py-1.5 text-sm rounded-full border border-border text-muted-foreground hover:border-foreground hover:bg-muted transition-colors"
              >
                {dest}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm mb-4">Füge 2–5 Städte hinzu. Der Agent plant alle Flüge, Hotels und Aktivitäten für jede Station.</p>
          <div className="space-y-3">
            {cities.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm w-5 text-center font-medium">{i + 1}</span>
                <AutocompleteInput
                  placeholder={`Stadt ${i + 1}`}
                  value={stop.city}
                  onChange={(v) => updateCity(i, v)}
                  autoFocus={i === 0}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateDays(i, Math.max(1, stop.days - 1))}
                    className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:bg-muted flex items-center justify-center text-sm"
                  >−</button>
                  <span className="text-sm text-foreground w-14 text-center font-medium">{stop.days}d</span>
                  <button
                    onClick={() => updateDays(i, Math.min(14, stop.days + 1))}
                    className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:bg-muted flex items-center justify-center text-sm"
                  >+</button>
                </div>
                {cities.length > 2 && (
                  <button
                    onClick={() => removeCity(i)}
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors text-lg leading-none"
                  >×</button>
                )}
              </div>
            ))}
          </div>
          {cities.length < 5 && (
            <button
              onClick={addCity}
              className="mt-3 text-sm text-brand hover:text-brand/80 font-medium"
            >
              + Stadt hinzufügen
            </button>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {[["Paris", "Rom", "Barcelona"], ["Tokyo", "Kyoto", "Osaka"], ["Lissabon", "Porto"]].map((route, i) => (
              <button
                key={i}
                onClick={() => onCitiesChange(route.map((city) => ({ city, days: 3 })))}
                className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:border-foreground hover:bg-muted transition-colors"
              >
                {route.join(" → ")}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StepDates({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  function handleStartChange(v: string) {
    onChangeStart(v);
    if (v) {
      // Auto-advance focus to return date after departure is picked
      setTimeout(() => {
        const el = document.getElementById("end-date-input");
        if (el) (el as HTMLInputElement).focus();
      }, 80);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 2</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Wann möchtest du reisen?</h2>
      <p className="text-muted-foreground text-sm mb-6">Ungefähre Daten reichen völlig aus.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Abreise</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleStartChange(e.target.value)}
            className="text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Rückkehr</label>
          <Input
            id="end-date-input"
            type="date"
            value={endDate}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="text-base"
          />
        </div>
      </div>
    </div>
  );
}

function StepTravelers({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const options = [1, 2, 3, 4, 5, 6];
  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 3</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Wie viele Personen reisen?</h2>
      <p className="text-muted-foreground text-sm mb-6">Inklusive dir.</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-colors min-h-[5rem] ${
              value === n
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            <span className="text-xl font-bold leading-none">{n}</span>
            <span className="text-xs mt-1 opacity-80">{n === 1 ? "Person" : "Personen"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepInterests({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 4</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Was sind deine Interessen?</h2>
      <p className="text-muted-foreground text-sm mb-6">Mehrere Auswahlen möglich.</p>
      <div className="grid grid-cols-2 gap-3">
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest.id);
          return (
            <button
              key={interest.id}
              onClick={() => onToggle(interest.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                isSelected
                  ? "border-foreground bg-foreground"
                  : "border-border hover:border-foreground"
              }`}
            >
              <interest.Icon
                size={18}
                className={isSelected ? "text-background" : "text-muted-foreground"}
                strokeWidth={1.75}
              />
              <span className={`text-sm font-medium ${isSelected ? "text-background" : "text-foreground"}`}>
                {interest.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBudget({
  value,
  budgetMode,
  onChange,
  onModeChange,
}: {
  value: number;
  budgetMode: "with-flights" | "activities-only";
  onChange: (v: number) => void;
  onModeChange: (v: "with-flights" | "activities-only") => void;
}) {
  const [inputVal, setInputVal] = useState(String(value));

  useEffect(() => { setInputVal(String(value)); }, [value]);

  function handleInputChange(raw: string) {
    setInputVal(raw);
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n >= 0) onChange(n);
  }

  function handleBlur() {
    if (!inputVal || inputVal === "0") {
      setInputVal("500");
      onChange(500);
    }
  }

  const presets = [1000, 2000, 3000, 5000, 10000];
  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 5</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Was ist dein Budget?</h2>
      <p className="text-muted-foreground text-sm mb-6">
        {budgetMode === "with-flights"
          ? "Gesamtbudget pro Person inkl. Flüge & Unterkunft."
          : "Budget pro Person für Aktivitäten & Essen (ohne Flüge & Hotel)."}
      </p>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl font-bold text-foreground">€</span>
        <input
          type="number"
          inputMode="numeric"
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={handleBlur}
          className="flex-1 text-2xl font-bold py-3 px-3 rounded-lg border border-input bg-transparent text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          min={500}
          max={50000}
          step={100}
        />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => { onChange(p); setInputVal(String(p)); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              value === p
                ? "border-foreground bg-foreground text-background font-medium"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            €{p.toLocaleString()}
          </button>
        ))}
      </div>
      {/* Budget scope toggle */}
      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          checked={budgetMode === "activities-only"}
          onChange={(e) => onModeChange(e.target.checked ? "activities-only" : "with-flights")}
          className="mt-0.5 w-4 h-4 rounded accent-foreground"
        />
        <div>
          <span className="text-sm font-medium text-foreground">Ohne Flug & Hotel</span>
          <p className="text-xs text-muted-foreground mt-0.5">Budget nur für Aktivitäten, Essen & Transport vor Ort.</p>
        </div>
      </label>
    </div>
  );
}

function StepSummary({ form }: { form: FormData }) {
  const selectedInterests = INTERESTS.filter((i) => form.interests.includes(i.id));
  const validCities = form.cities.filter((c) => c.city.trim());
  const totalDays = validCities.reduce((sum, c) => sum + c.days, 0);

  const destinationValue = form.isMultiCity
    ? validCities.map((c) => `${c.city} (${c.days}d)`).join(" → ")
    : form.destination || "Noch nicht angegeben";

  return (
    <div>
      <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-2">Schritt 6</p>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Alles klar. Los geht&apos;s!</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Hier ist eine Zusammenfassung — dann startet der AI-Agent.
      </p>
      <div className="space-y-3">
        {form.origin && (
          <SummaryRow icon="🛫" label="Abflugort" value={form.origin} />
        )}
        <SummaryRow icon={form.isMultiCity ? "🗺️" : "📍"} label={form.isMultiCity ? "Route" : "Destination"} value={destinationValue} />
        {form.isMultiCity && (
          <SummaryRow icon="📆" label="Gesamtreisedauer" value={`${totalDays} Tage`} />
        )}
        <SummaryRow
          icon="📅"
          label="Zeitraum"
          value={
            form.startDate && form.endDate
              ? `${form.startDate} → ${form.endDate}`
              : "Noch nicht angegeben"
          }
        />
        <SummaryRow icon="👥" label="Personen" value={`${form.travelers}`} />
        <SummaryRow
          icon="❤️"
          label="Interessen"
          value={
            selectedInterests.length > 0
              ? selectedInterests.map((i) => i.label).join(", ")
              : "Keine ausgewählt"
          }
        />
        <SummaryRow
          icon="💶"
          label="Budget"
          value={`€${form.budget.toLocaleString()} pro Person${form.budgetMode === "activities-only" ? " (ohne Flug & Hotel)" : ""}`}
        />
      </div>
      {form.adventureMode && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
          <span>⚡</span>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Adventure Mode — off-beat destinations, raw experiences, no tourist traps.
          </p>
        </div>
      )}
      {form.interests.includes("family") && (
        <div className="mt-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 flex items-center gap-2">
          <span>🎡</span>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
            Family Mode — kid-friendly activities, family rooms & child discount notes.
          </p>
        </div>
      )}
      <div className="mt-4 p-4 rounded-xl bg-muted border border-border">
        <p className="text-sm text-foreground font-medium">
          {form.isMultiCity
            ? `🤖 Der AI-Agent plant jetzt alle ${validCities.length} Stationen: Flüge, Hotels und Aktivitäten für jede Stadt.`
            : "🤖 Der AI-Agent analysiert Flüge, Hotels und Aktivitäten und erstellt dir 5 Reisevorschläge."}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted">
      <span className="text-base mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
