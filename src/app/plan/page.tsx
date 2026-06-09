"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const TOTAL_STEPS = 6;

const INTERESTS = [
  { id: "culture", label: "Kultur & Geschichte", icon: "🏛️" },
  { id: "nature", label: "Natur & Wandern", icon: "🌿" },
  { id: "beach", label: "Strand & Meer", icon: "🏖️" },
  { id: "city", label: "Städtetrip", icon: "🏙️" },
  { id: "adventure", label: "Abenteuer", icon: "🧗" },
  { id: "food", label: "Kulinarik", icon: "🍽️" },
  { id: "luxury", label: "Luxus & Wellness", icon: "✨" },
  { id: "family", label: "Familie", icon: "👨‍👩‍👧" },
];

type CityStop = { city: string; days: number };

type FormData = {
  isMultiCity: boolean;
  destination: string;
  cities: CityStop[];
  startDate: string;
  endDate: string;
  travelers: number;
  interests: string[];
  budget: number;
};

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Lädt...</p></div>}>
      <PlanContent />
    </Suspense>
  );
}

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    isMultiCity: false,
    destination: searchParams.get("destination") || "",
    cities: [
      { city: searchParams.get("destination") || "", days: 3 },
      { city: "", days: 3 },
      { city: "", days: 3 },
    ],
    startDate: "",
    endDate: "",
    travelers: 2,
    interests: [],
    budget: 3000,
  });

  function nextStep() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }
  function prevStep() {
    if (step > 1) setStep((s) => s - 1);
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
    <div className="min-h-screen bg-[#fffbf7] flex flex-col">
      {/* Header */}
      <nav className="bg-[#fffbf7] border-b border-[#e8e4e0] px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-[#1c1917]">✈ TravelAgent</span>
          <span className="text-sm text-[#a8a29e]">
            Schritt {step} von {TOTAL_STEPS}
          </span>
        </div>
      </nav>

      {/* Progress */}
      <div className="bg-[#fffbf7] border-b border-[#e8e4e0] px-6 py-3">
        <div className="max-w-xl mx-auto">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm p-8">
            {step === 1 && (
              <StepDestination
                isMultiCity={form.isMultiCity}
                onToggleMode={() => setForm((f) => ({ ...f, isMultiCity: !f.isMultiCity }))}
                value={form.destination}
                onChange={(v) => setForm((f) => ({ ...f, destination: v }))}
                cities={form.cities}
                onCitiesChange={(cities) => setForm((f) => ({ ...f, cities }))}
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
                onChange={(v) => setForm((f) => ({ ...f, budget: v }))}
              />
            )}
            {step === 6 && <StepSummary form={form} />}

            {/* Navigation */}
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
                <Button onClick={handleSubmit} className="flex-1 bg-[#e85d3a] hover:bg-[#d04e2d]">
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

function StepDestination({
  isMultiCity,
  onToggleMode,
  value,
  onChange,
  cities,
  onCitiesChange,
}: {
  isMultiCity: boolean;
  onToggleMode: () => void;
  value: string;
  onChange: (v: string) => void;
  cities: CityStop[];
  onCitiesChange: (cities: CityStop[]) => void;
}) {
  function updateCity(index: number, city: string) {
    const next = cities.map((c, i) => (i === index ? { ...c, city } : c));
    onCitiesChange(next);
  }
  function updateDays(index: number, days: number) {
    const next = cities.map((c, i) => (i === index ? { ...c, days } : c));
    onCitiesChange(next);
  }
  function addCity() {
    if (cities.length < 5) onCitiesChange([...cities, { city: "", days: 3 }]);
  }
  function removeCity(index: number) {
    if (cities.length > 2) onCitiesChange(cities.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 1</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Wohin soll die Reise gehen?</h2>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { if (isMultiCity) onToggleMode(); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            !isMultiCity
              ? "bg-[#e85d3a] text-white border-[#e85d3a]"
              : "bg-white text-gray-500 border-gray-200 hover:border-[#e85d3a]"
          }`}
        >
          Ein Ziel
        </button>
        <button
          onClick={() => { if (!isMultiCity) onToggleMode(); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            isMultiCity
              ? "bg-[#e85d3a] text-white border-[#e85d3a]"
              : "bg-white text-gray-500 border-gray-200 hover:border-[#e85d3a]"
          }`}
        >
          Multi-City Tour
        </button>
      </div>

      {!isMultiCity ? (
        <>
          <p className="text-gray-500 text-sm mb-4">Land, Stadt oder Region — auch &quot;Irgendwo warm&quot; funktioniert.</p>
          <Input
            placeholder="z.B. Japan, Portugal, Bali..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-base py-5"
            autoFocus
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {["Japan", "Portugal", "Costa Rica", "Griechenland", "Marokko"].map((dest) => (
              <button
                key={dest}
                onClick={() => onChange(dest)}
                className="px-3 py-1.5 text-sm rounded-full border border-gray-200 text-gray-600 hover:border-[#e85d3a] hover:bg-[#fdf0ec] transition-colors"
              >
                {dest}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">Füge 2–5 Städte hinzu. Der Agent plant alle Flüge, Hotels und Aktivitäten für jede Station.</p>
          <div className="space-y-3">
            {cities.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-5 text-center font-medium">{i + 1}</span>
                <Input
                  placeholder={`Stadt ${i + 1}`}
                  value={stop.city}
                  onChange={(e) => updateCity(i, e.target.value)}
                  className="flex-1"
                  autoFocus={i === 0}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateDays(i, Math.max(1, stop.days - 1))}
                    className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-sm"
                  >−</button>
                  <span className="text-sm text-gray-700 w-14 text-center font-medium">{stop.days}d</span>
                  <button
                    onClick={() => updateDays(i, Math.min(14, stop.days + 1))}
                    className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-sm"
                  >+</button>
                </div>
                {cities.length > 2 && (
                  <button
                    onClick={() => removeCity(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  >×</button>
                )}
              </div>
            ))}
          </div>
          {cities.length < 5 && (
            <button
              onClick={addCity}
              className="mt-3 text-sm text-[#e85d3a] hover:text-[#d04e2d] font-medium"
            >
              + Stadt hinzufügen
            </button>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {[["Paris", "Rom", "Barcelona"], ["Tokyo", "Kyoto", "Osaka"], ["Lissabon", "Porto"]].map((route, i) => (
              <button
                key={i}
                onClick={() => onCitiesChange(route.map((city) => ({ city, days: 3 })))}
                className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-[#e85d3a] hover:bg-[#fdf0ec] transition-colors"
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
  return (
    <div>
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 2</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Wann möchtest du reisen?</h2>
      <p className="text-gray-500 text-sm mb-6">Ungefähre Daten reichen völlig aus.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abreise</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onChangeStart(e.target.value)}
            className="text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rückkehr</label>
          <Input
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
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 3</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Wie viele Personen reisen?</h2>
      <p className="text-gray-500 text-sm mb-6">Inklusive dir.</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`py-4 rounded-xl border-2 text-lg font-semibold transition-colors ${
              value === n
                ? "border-[#e85d3a] bg-[#fdf0ec] text-[#e85d3a]"
                : "border-gray-200 text-gray-600 hover:border-[#e85d3a]"
            }`}
          >
            {n} {n === 1 ? "Person" : "Personen"}
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
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 4</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Was sind deine Interessen?</h2>
      <p className="text-gray-500 text-sm mb-6">Mehrere Auswahlen möglich.</p>
      <div className="grid grid-cols-2 gap-3">
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            onClick={() => onToggle(interest.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              selected.includes(interest.id)
                ? "border-[#e85d3a] bg-[#fdf0ec]"
                : "border-gray-200 hover:border-[#e85d3a]"
            }`}
          >
            <span className="text-xl">{interest.icon}</span>
            <span
              className={`text-sm font-medium ${
                selected.includes(interest.id) ? "text-[#c4422a]" : "text-gray-700"
              }`}
            >
              {interest.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBudget({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const presets = [1000, 2000, 3000, 5000, 10000];
  return (
    <div>
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 5</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Was ist dein Budget?</h2>
      <p className="text-gray-500 text-sm mb-6">
        Gesamtbudget pro Person inkl. Flüge & Unterkunft.
      </p>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl font-bold text-gray-900">€</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-2xl font-bold py-5 text-gray-900"
          min={500}
          max={50000}
          step={100}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              value === p
                ? "border-[#e85d3a] bg-[#fdf0ec] text-[#e85d3a] font-medium"
                : "border-gray-200 text-gray-600 hover:border-[#e85d3a]"
            }`}
          >
            €{p.toLocaleString()}
          </button>
        ))}
      </div>
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
      <p className="text-xs font-medium text-[#e85d3a] uppercase tracking-wider mb-2">Schritt 6</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Alles klar. Los geht&apos;s!</h2>
      <p className="text-gray-500 text-sm mb-6">
        Hier ist eine Zusammenfassung — dann startet der AI-Agent.
      </p>
      <div className="space-y-3">
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
        <SummaryRow icon="💶" label="Budget" value={`€${form.budget.toLocaleString()} pro Person`} />
      </div>
      <div className="mt-6 p-4 rounded-xl bg-[#fdf0ec] border border-[#fbe1d9]">
        <p className="text-sm text-[#c4422a] font-medium">
          {form.isMultiCity
            ? `🤖 Der AI-Agent plant jetzt alle ${validCities.length} Stationen: Flüge, Hotels und Aktivitäten für jede Stadt.`
            : "🤖 Der AI-Agent wird jetzt Flüge, Hotels und Aktivitäten analysieren und dir 3 Reisevorschläge erstellen."}
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
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
      <span className="text-base mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
