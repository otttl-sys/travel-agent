"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Lightbulb, Map, CalendarDays, MessageCircle, CalendarRange, FileText,
  PartyPopper, Stamp, Coins, CloudSun, Globe, Smartphone, ShieldCheck,
  Plane, Calendar, Globe2, MapPinned,
  Users, TrendingDown, TrendingUp, Minus, Check, CalendarPlus, Loader2,
} from "lucide-react";

const DESTINATION_PHOTOS: [string[], string][] = [
  [["japan", "tokyo", "kyoto", "osaka"],        "photo-1540959733332-eab4deabeeaf"],
  [["portugal", "lisbon", "porto"],             "photo-1555881400-74d7acaacd8b"],
  [["morocco", "marrakech", "fez"],             "photo-1539020140153-e479b8c22e70"],
  [["bali", "indonesia"],                       "photo-1537996194471-e657df975ab4"],
  [["greece", "santorini", "athens", "mykonos"],"photo-1533105079780-92b9be482077"],
  [["italy", "rome", "venice", "florence"],     "photo-1523906834658-6e24ef2386f9"],
  [["thailand", "bangkok", "phuket", "chiang"], "photo-1528360983277-13d401cdc186"],
  [["france", "paris"],                         "photo-1502602898657-3e91760cbb34"],
  [["spain", "barcelona", "madrid", "seville"], "photo-1539037116277-4db20889f2d4"],
  [["colombia", "cartagena", "medellin"],       "photo-1566438480900-0609be27a4be"],
  [["brazil", "rio"],                           "photo-1483729558449-99ef09a8c325"],
  [["kenya", "safari", "nairobi"],              "photo-1516026672322-bc52d61a55d5"],
  [["vietnam", "hanoi", "ho chi minh"],         "photo-1559592413-7cec4d0cae2b"],
  [["dubai", "abu dhabi", "uae"],               "photo-1512453979798-5ea266f8880c"],
  [["canada", "toronto", "vancouver"],          "photo-1534430480872-3498386e7856"],
  [["australia", "sydney", "melbourne"],        "photo-1523482580672-f109ba8cb9be"],
  [["iceland", "reykjavik"],                    "photo-1504893524553-b855bce32c67"],
  [["maldives"],                                "photo-1514282401047-d79a71a590e8"],
  [["peru", "machu picchu", "lima"],            "photo-1526392060635-9d6019884377"],
  [["mexico", "cancun", "oaxaca"],              "photo-1518638150340-f706e86654de"],
  [["india", "taj mahal", "delhi", "mumbai"],   "photo-1506905925346-21bda4d32df4"],
  [["turkey", "istanbul"],                      "photo-1524231757912-21f4fe3a7200"],
  [["new zealand"],                             "photo-1469521669194-babb45599def"],
];
const FALLBACK_PHOTO = "photo-1488646953014-85cb44e25828";

function getDestinationPhoto(dest: string): string {
  const lower = dest.toLowerCase();
  for (const [keywords, id] of DESTINATION_PHOTOS) {
    if (keywords.some((k) => lower.includes(k))) return id;
  }
  return FALLBACK_PHOTO;
}
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { getSavedTrips, deleteTrip, updatePriceWatch, updateDayPlan, updateBriefing, updateEvents, updateVisa, updateBudget, updateConversations, updateNearbyPlaces, updateTripVisibility, type SavedTrip, type PriceWatch, type DayPlan, type Briefing, type EventsResult, type VisaResult, type BudgetResult, type ConversationThread } from "@/lib/saved-trips";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";
import { ConciergeChat, type ChatMessage } from "@/components/concierge-chat";
import { DayTimeline, type DaySchedule } from "@/components/day-timeline";
import { BriefingCard, type BriefingSection } from "@/components/briefing-card";
import { EventsList, type EventItem } from "@/components/events-list";
import { VisaCard, type VisaRequirement, type EVisaAction } from "@/components/visa-card";
import { BudgetBreakdown, type BudgetLine } from "@/components/budget-breakdown";
import { WeatherForecast, type WeatherResult } from "@/components/weather-forecast";
import type { NearbyPlace } from "@/lib/google-maps";
import { TripMap } from "@/components/trip-map";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "ideas" | "plan" | "concierge" | "day-plan" | "briefing" | "events" | "visa" | "budget" | "weather" | "culture" | "sim" | "insurance" | "timeline";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "ideas",     label: "Ideas",     icon: Lightbulb },
  { id: "plan",      label: "Plan",      icon: Map },
  { id: "timeline",  label: "Timeline",  icon: CalendarDays },
  { id: "concierge", label: "Concierge", icon: MessageCircle },
  { id: "day-plan",  label: "Day Plan",  icon: CalendarRange },
  { id: "briefing",  label: "Briefing",  icon: FileText },
  { id: "events",    label: "Events",    icon: PartyPopper },
  { id: "visa",      label: "Visa",      icon: Stamp },
  { id: "budget",    label: "Budget",    icon: Coins },
  { id: "weather",   label: "Weather",   icon: CloudSun },
  { id: "culture",   label: "Culture",   icon: Globe },
  { id: "sim",       label: "SIM",       icon: Smartphone },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
];

type AgentItem = {
  icon: string;
  category: string;
  title: string;
  details: string;
};

type CultureResult = { destination: string; items: AgentItem[] };
type SimResult    = { destination: string; items: AgentItem[] };
type InsuranceResult = { destination: string; items: AgentItem[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TREND_META: Record<PriceWatch["trend"], { Icon: LucideIcon; label: string; color: string }> = {
  down: { Icon: TrendingDown, label: "Looks cheaper", color: "text-green-600" },
  up:   { Icon: TrendingUp,   label: "Looks pricier", color: "text-red-500" },
  same: { Icon: Minus,        label: "About the same", color: "text-brand" },
};

function detectTrend(text: string): PriceWatch["trend"] {
  const lower = text.toLowerCase();
  if (/günstiger|billiger|gesunken|gefallen|niedriger|cheaper|lower|dropped/.test(lower)) return "down";
  if (/teurer|gestiegen|höher|angestiegen|expensive|higher|risen/.test(lower)) return "up";
  return "same";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  // single tab-per-card replaces 7 separate open/close states
  const [activeTab, setActiveTab] = useState<Record<string, TabId | null>>({});

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [priceTraces, setPriceTraces] = useState<Record<string, TraceEntry[]>>({});
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [conciergeTraces, setConciergeTraces] = useState<Record<string, TraceEntry[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<Record<string, string | null>>({});

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [itineraryTraces, setItineraryTraces] = useState<Record<string, TraceEntry[]>>({});

  const [generatingBriefingId, setGeneratingBriefingId] = useState<string | null>(null);
  const [briefingTraces, setBriefingTraces] = useState<Record<string, TraceEntry[]>>({});

  const [generatingEventsId, setGeneratingEventsId] = useState<string | null>(null);
  const [eventsTraces, setEventsTraces] = useState<Record<string, TraceEntry[]>>({});

  const [generatingVisaId, setGeneratingVisaId] = useState<string | null>(null);
  const [visaTraces, setVisaTraces] = useState<Record<string, TraceEntry[]>>({});
  const [visaPassport, setVisaPassport] = useState<Record<string, string>>({});

  const [generatingBudgetId, setGeneratingBudgetId] = useState<string | null>(null);
  const [budgetTraces, setBudgetTraces] = useState<Record<string, TraceEntry[]>>({});

  const [weatherData, setWeatherData] = useState<Record<string, WeatherResult>>({});
  const [loadingWeatherId, setLoadingWeatherId] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<Record<string, string>>({});

  const [nearbyPlaces, setNearbyPlaces] = useState<Record<string, NearbyPlace[]>>({});
  const [publicState, setPublicState] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [profilePassport, setProfilePassport] = useState<string>("");

  const [cultureData, setCultureData] = useState<Record<string, CultureResult>>({});
  const [generatingCultureId, setGeneratingCultureId] = useState<string | null>(null);
  const [cultureTraces, setCultureTraces] = useState<Record<string, TraceEntry[]>>({});

  const [simData, setSimData] = useState<Record<string, SimResult>>({});
  const [generatingSimId, setGeneratingSimId] = useState<string | null>(null);
  const [simTraces, setSimTraces] = useState<Record<string, TraceEntry[]>>({});

  const [insuranceData, setInsuranceData] = useState<Record<string, InsuranceResult>>({});
  const [generatingInsuranceId, setGeneratingInsuranceId] = useState<string | null>(null);
  const [insuranceTraces, setInsuranceTraces] = useState<Record<string, TraceEntry[]>>({});

  const [timelineData, setTimelineData] = useState<Record<string, DaySchedule[]>>({});
  const [generatingTimelineId, setGeneratingTimelineId] = useState<string | null>(null);

  useEffect(() => {
    getSavedTrips().then(loaded => {
      setTrips(loaded);
      const places: Record<string, NearbyPlace[]> = {};
      const pub: Record<string, boolean> = {};
      for (const trip of loaded) {
        if (trip.nearbyPlaces?.length) places[trip.id] = trip.nearbyPlaces;
        pub[trip.id] = trip.isPublic ?? false;
      }
      setNearbyPlaces(prev => ({ ...prev, ...places }));
      setPublicState(pub);
    });
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => { if (profile?.passport_country) setProfilePassport(profile.passport_country); })
      .catch(() => {});
  }, []);

  // Auto-fetch weather when weather tab is opened
  useEffect(() => {
    trips.forEach(trip => {
      if (activeTab[trip.id] === "weather" && !weatherData[trip.id] && loadingWeatherId !== trip.id) {
        fetchWeather(trip);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trips]);

  // ── Tab helpers ──────────────────────────────────────────────────────────────

  function openTab(tripId: string, tab: TabId) {
    if (tab === "visa" && profilePassport && !visaPassport[tripId]) {
      setVisaPassport(prev => ({ ...prev, [tripId]: profilePassport }));
    }
    setActiveTab(prev => ({ ...prev, [tripId]: prev[tripId] === tab ? null : tab }));
  }

  function hasContent(trip: SavedTrip, tabId: TabId): boolean {
    switch (tabId) {
      case "ideas":     return (conversations[trip.id]?.length ?? 0) > 0;
      case "plan":      return !!trip.aiResult;
      case "concierge": return (conversations[trip.id]?.length ?? 0) > 0;
      case "day-plan":  return !!trip.dayPlan;
      case "briefing":  return !!trip.briefing;
      case "events":    return !!trip.events;
      case "visa":      return !!trip.visa;
      case "budget":    return !!trip.budgetResult;
      case "weather":   return !!weatherData[trip.id];
      case "culture":   return !!cultureData[trip.id];
      case "sim":       return !!simData[trip.id];
      case "insurance": return !!insuranceData[trip.id];
      case "timeline":  return !!timelineData[trip.id];
    }
  }

  async function fetchWeather(trip: SavedTrip) {
    if (!trip.startDate || !trip.endDate) return;
    setLoadingWeatherId(trip.id);
    setWeatherError(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
    const dest = trip.isMultiCity ? trip.cities.join(" → ") : trip.destination;
    const params = new URLSearchParams({ destination: dest, startDate: trip.startDate, endDate: trip.endDate });
    try {
      const res = await fetch(`/api/weather?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Weather fetch failed");
      const data: WeatherResult = await res.json();
      setWeatherData(prev => ({ ...prev, [trip.id]: data }));
    } catch (err) {
      setWeatherError(prev => ({ ...prev, [trip.id]: err instanceof Error ? err.message : "Failed to load weather" }));
    } finally {
      setLoadingWeatherId(null);
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleShare(id: string) {
    const url = `${window.location.origin}/trip/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleDelete(id: string) {
    void deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
    setActiveTab(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function handleTogglePublic(id: string) {
    if (togglingId) return;
    setTogglingId(id);
    const next = !publicState[id];
    setPublicState(prev => ({ ...prev, [id]: next }));
    await updateTripVisibility(id, next);
    setTogglingId(null);
  }

  async function checkPrice(trip: SavedTrip) {
    if (checkingId) return;
    setCheckingId(trip.id);
    setPriceTraces(prev => ({ ...prev, [trip.id]: [] }));
    setVerdicts(prev => ({ ...prev, [trip.id]: "" }));

    const cardBudget = trip.cards?.[0]?.budget;
    const body = {
      destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination,
      startDate: trip.startDate, endDate: trip.endDate, travelers: trip.travelers,
      style: "comfort",
      baselineFlights: trip.baselineFlights ?? cardBudget?.flights ?? null,
      baselineHotel: trip.baselineHotel ?? cardBudget?.hotel ?? null,
    };

    try {
      const res = await fetch("/api/price-watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; text?: string; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setPriceTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setPriceTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "token") { result += parsed.text ?? ""; setVerdicts(prev => ({ ...prev, [trip.id]: result })); }
          if (parsed.type === "result") { result = parsed.text ?? result; setVerdicts(prev => ({ ...prev, [trip.id]: result })); }
          if (parsed.type === "error") { result = parsed.message ?? "Price check failed."; setVerdicts(prev => ({ ...prev, [trip.id]: result })); }
        }
      }
      if (result.trim()) {
        const priceWatch: PriceWatch = { lastChecked: new Date().toISOString(), trend: detectTrend(result), summary: result.trim() };
        updatePriceWatch(trip.id, priceWatch);
        setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, priceWatch } : t));
      }
    } catch {
      setVerdicts(prev => ({ ...prev, [trip.id]: "Connection error. Please try again." }));
    } finally {
      setCheckingId(null);
    }
  }

  // Persist the current message list as a conversation thread (new or existing)
  function persistConversation(trip: SavedTrip, messages: ChatMessage[]) {
    const existing = trip.conversations ?? [];
    const activeId = activeConversationId[trip.id];
    const firstUserMsg = messages.find(m => m.role === "user")?.content ?? "New chat";
    const title = firstUserMsg.length > 48 ? firstUserMsg.slice(0, 48) + "…" : firstUserMsg;
    const now = new Date().toISOString();

    let next: ConversationThread[];
    if (activeId && existing.some(c => c.id === activeId)) {
      next = existing.map(c => c.id === activeId ? { ...c, messages, updatedAt: now } : c);
    } else {
      const id = `${trip.id}-${Date.now()}`;
      next = [{ id, title, messages, updatedAt: now }, ...existing];
      setActiveConversationId(prev => ({ ...prev, [trip.id]: id }));
    }

    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, conversations: next } : t));
    void updateConversations(trip.id, next);
  }

  function startNewChat(tripId: string) {
    setConversations(prev => ({ ...prev, [tripId]: [] }));
    setActiveConversationId(prev => ({ ...prev, [tripId]: null }));
  }

  function openConversation(tripId: string, thread: ConversationThread) {
    setConversations(prev => ({ ...prev, [tripId]: thread.messages }));
    setActiveConversationId(prev => ({ ...prev, [tripId]: thread.id }));
  }

  async function sendMessage(trip: SavedTrip, text: string, imageUrl?: string) {
    if (sendingId) return;
    const history = [...(conversations[trip.id] ?? []), { role: "user" as const, content: text, ...(imageUrl ? { imageUrl } : {}) }];
    setConversations(prev => ({ ...prev, [trip.id]: history }));
    setConciergeTraces(prev => ({ ...prev, [trip.id]: [] }));
    setSendingId(trip.id);

    const card = trip.cards?.[0];
    const body = {
      trip: {
        destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        themes: card?.themes ?? [],
        itinerary: card?.itinerary ?? [],
        nearbyPlaces: nearbyPlaces[trip.id] ?? [],
        events: trip.events?.events ?? [],
      },
      messages: history,
    };

    let finalMessages = history;
    let cards: ChatMessage["cards"] = [];
    try {
      const res = await fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; text?: string; message?: string; card?: "places" | "events"; items?: NearbyPlace[] | EventItem[] };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setConciergeTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setConciergeTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "token") result += parsed.text ?? "";
          if (parsed.type === "result") result = parsed.text ?? result;
          if (parsed.type === "error") result = parsed.message ?? "Reply failed.";
          if (parsed.type === "card" && parsed.card && parsed.items) {
            cards = [...(cards ?? []), parsed.card === "places"
              ? { type: "places", items: parsed.items as NearbyPlace[] }
              : { type: "events", items: parsed.items as EventItem[] }];
          }
        }
      }
      const reply = result.trim();
      if (reply) {
        finalMessages = [...history, { role: "assistant", content: reply, ...(cards?.length ? { cards } : {}) }];
        setConversations(prev => ({ ...prev, [trip.id]: finalMessages }));
      }
    } catch {
      finalMessages = [...history, { role: "assistant", content: "Connection error. Please try again." }];
      setConversations(prev => ({ ...prev, [trip.id]: finalMessages }));
    } finally {
      setSendingId(null);
      setConciergeTraces(prev => ({ ...prev, [trip.id]: [] }));
      persistConversation(trip, finalMessages);
    }
  }

  async function generateItinerary(trip: SavedTrip) {
    if (generatingId) return;
    setGeneratingId(trip.id);
    setItineraryTraces(prev => ({ ...prev, [trip.id]: [] }));
    const card = trip.cards?.[0];
    const body = { destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination, themes: card?.themes ?? [], itinerary: card?.itinerary ?? [] };
    try {
      const res = await fetch("/api/itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; days?: DaySchedule[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setItineraryTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setItineraryTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "schedule" && parsed.days) {
            const dayPlan: DayPlan = { generatedAt: new Date().toISOString(), days: parsed.days };
            updateDayPlan(trip.id, dayPlan);
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, dayPlan } : t));
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingId(null);
      setItineraryTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateBriefing(trip: SavedTrip) {
    if (generatingBriefingId) return;
    setGeneratingBriefingId(trip.id);
    setBriefingTraces(prev => ({ ...prev, [trip.id]: [] }));
    const dayPlanSummary = trip.dayPlan?.days.map(d => `${d.day}: ${d.blocks.map(b => b.activity).join(", ")}`);
    const body = { destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination, startDate: trip.startDate, endDate: trip.endDate, travelers: trip.travelers, themes: trip.cards?.[0]?.themes ?? [], priceWatch: trip.priceWatch ? { trend: trip.priceWatch.trend, summary: trip.priceWatch.summary } : undefined, dayPlanSummary };
    try {
      const res = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; sections?: BriefingSection[]; places?: NearbyPlace[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setBriefingTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setBriefingTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "nearby_places" && parsed.places) {
            setNearbyPlaces(prev => ({ ...prev, [trip.id]: parsed.places! }));
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, nearbyPlaces: parsed.places } : t));
            updateNearbyPlaces(trip.id, parsed.places);
          }
          if (parsed.type === "briefing" && parsed.sections) {
            const briefing: Briefing = { generatedAt: new Date().toISOString(), sections: parsed.sections };
            updateBriefing(trip.id, briefing);
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, briefing } : t));
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingBriefingId(null);
      setBriefingTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateEvents(trip: SavedTrip) {
    if (generatingEventsId) return;
    setGeneratingEventsId(trip.id);
    setEventsTraces(prev => ({ ...prev, [trip.id]: [] }));
    const body = { destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination, startDate: trip.startDate, endDate: trip.endDate, themes: trip.cards?.[0]?.themes ?? [] };
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; events?: EventItem[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setEventsTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setEventsTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "events" && parsed.events) {
            const events: EventsResult = { generatedAt: new Date().toISOString(), events: parsed.events };
            updateEvents(trip.id, events);
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, events } : t));
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingEventsId(null);
      setEventsTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateBudget(trip: SavedTrip) {
    if (generatingBudgetId) return;
    setGeneratingBudgetId(trip.id);
    setBudgetTraces(prev => ({ ...prev, [trip.id]: [] }));
    const body = { destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination, startDate: trip.startDate, endDate: trip.endDate, travelers: trip.travelers, budget: trip.budget };
    try {
      const res = await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; lines?: BudgetLine[]; totalPerPerson?: number; totalAll?: number; verdict?: string; verdictNote?: string; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setBudgetTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setBudgetTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "budget" && parsed.lines) {
            const budgetResult: BudgetResult = { generatedAt: new Date().toISOString(), estimate: { lines: parsed.lines, totalPerPerson: parsed.totalPerPerson ?? 0, totalAll: parsed.totalAll ?? 0, verdict: (parsed.verdict as BudgetResult["estimate"]["verdict"]) ?? "tight", verdictNote: parsed.verdictNote ?? "" } };
            updateBudget(trip.id, budgetResult);
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, budgetResult } : t));
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingBudgetId(null);
      setBudgetTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateVisa(trip: SavedTrip, passport: string) {
    if (generatingVisaId) return;
    setGeneratingVisaId(trip.id);
    setVisaTraces(prev => ({ ...prev, [trip.id]: [] }));
    const body = { destination: trip.isMultiCity ? trip.cities.join(" → ") : trip.destination, startDate: trip.startDate, endDate: trip.endDate, passport };
    try {
      const res = await fetch("/api/visa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; requirements?: VisaRequirement[]; disclaimer?: string; actions?: EVisaAction[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setVisaTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setVisaTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "visa" && parsed.requirements) {
            const visa: VisaResult = { generatedAt: new Date().toISOString(), passport, requirements: parsed.requirements, disclaimer: parsed.disclaimer ?? "" };
            updateVisa(trip.id, visa);
            setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, visa } : t));
          }
          if (parsed.type === "evisa_actions" && parsed.actions) {
            setTrips(prev => prev.map(t => t.id === trip.id && t.visa ? { ...t, visa: { ...t.visa, eVisaActions: parsed.actions } } : t));
            updateVisa(trip.id, { ...(trips.find(t => t.id === trip.id)?.visa as VisaResult), eVisaActions: parsed.actions });
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingVisaId(null);
      setVisaTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateCulture(trip: SavedTrip) {
    if (generatingCultureId) return;
    setGeneratingCultureId(trip.id);
    setCultureTraces(prev => ({ ...prev, [trip.id]: [] }));
    const dest = trip.isMultiCity ? trip.cities[0] : trip.destination;
    try {
      const res = await fetch("/api/culture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination: dest }) });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; items?: AgentItem[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool)
            setCultureTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id)
            setCultureTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "culture" && parsed.items) {
            setCultureData(prev => ({ ...prev, [trip.id]: { destination: dest, items: parsed.items! } }));
          }
        }
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingCultureId(null);
      setCultureTraces(prev => ({ ...prev, [trip.id]: [] }));
    }
  }

  async function generateSim(trip: SavedTrip) {
    if (generatingSimId) return;
    setGeneratingSimId(trip.id);
    setSimTraces(prev => ({ ...prev, [trip.id]: [] }));
    const dest = trip.isMultiCity ? trip.cities[0] : trip.destination;
    try {
      const res = await fetch("/api/sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination: dest }) });
      const reader = res.body?.getReader(); const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", ""); if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; items?: AgentItem[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool) setSimTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id) setSimTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "sim" && parsed.items) setSimData(prev => ({ ...prev, [trip.id]: { destination: dest, items: parsed.items! } }));
        }
      }
    } catch { /* non-fatal */ } finally { setGeneratingSimId(null); setSimTraces(prev => ({ ...prev, [trip.id]: [] })); }
  }

  async function generateInsurance(trip: SavedTrip) {
    if (generatingInsuranceId) return;
    setGeneratingInsuranceId(trip.id);
    setInsuranceTraces(prev => ({ ...prev, [trip.id]: [] }));
    const dest = trip.isMultiCity ? trip.cities[0] : trip.destination;
    try {
      const res = await fetch("/api/insurance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination: dest, startDate: trip.startDate, endDate: trip.endDate, travelers: trip.travelers }) });
      const reader = res.body?.getReader(); const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          const data = line.replace("data: ", ""); if (data === "[DONE]") break;
          let parsed: { type: string; id?: string; tool?: string; input?: Record<string, unknown>; iteration?: number; items?: AgentItem[]; message?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.type === "tool_call" && parsed.id && parsed.tool) setInsuranceTraces(prev => ({ ...prev, [trip.id]: [...(prev[trip.id] ?? []), { id: parsed.id!, iteration: parsed.iteration ?? 1, tool: parsed.tool!, input: parsed.input ?? {}, status: "running" }] }));
          if (parsed.type === "tool_done" && parsed.id) setInsuranceTraces(prev => ({ ...prev, [trip.id]: (prev[trip.id] ?? []).map(e => e.id === parsed.id ? { ...e, status: "done" } : e) }));
          if (parsed.type === "insurance" && parsed.items) setInsuranceData(prev => ({ ...prev, [trip.id]: { destination: dest, items: parsed.items! } }));
        }
      }
    } catch { /* non-fatal */ } finally { setGeneratingInsuranceId(null); setInsuranceTraces(prev => ({ ...prev, [trip.id]: [] })); }
  }

  async function generateTimeline(trip: SavedTrip) {
    if (generatingTimelineId || !trip.aiResult) return;
    setGeneratingTimelineId(trip.id);
    try {
      const res = await fetch("/api/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiResult: trip.aiResult, startDate: trip.startDate }) });
      if (!res.ok) return;
      const { days } = await res.json();
      if (Array.isArray(days) && days.length > 0) setTimelineData(prev => ({ ...prev, [trip.id]: days }));
    } catch { /* non-fatal */ } finally { setGeneratingTimelineId(null); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link href="/packing" className="text-sm text-muted-foreground hidden sm:block hover:text-foreground transition-colors">
          Packing List
        </Link>
        <Link href="/plan"><Button size="sm">Plan a trip</Button></Link>
      </SiteNav>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-headline font-extrabold text-foreground">My Saved Trips</h1>
            <p className="text-muted-foreground mt-1">{trips.length} {trips.length === 1 ? "trip" : "trips"} saved</p>
          </div>

          {trips.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center mb-4 mx-auto">
                <Plane size={22} strokeWidth={1.5} className="text-background" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No saved trips yet</h3>
              <p className="text-muted-foreground mb-6 text-sm">Plan a trip and tap &quot;Save Trip&quot; to see it here.</p>
              <Link href="/plan"><Button>Plan your first trip →</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => {
                const tab = activeTab[trip.id] ?? null;
                const dest = trip.isMultiCity ? trip.cities.join(" → ") : trip.destination;

                return (
                  <div key={trip.id} className="bg-surface rounded-2xl border border-border overflow-hidden">

                    {/* ── Destination image ── */}
                    <div className="relative h-28 overflow-hidden">
                      <Image
                        src={`https://images.unsplash.com/${getDestinationPhoto(dest)}?w=800&q=70&auto=format&fit=crop`}
                        alt={dest}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <p className="text-white font-bold text-lg leading-tight tracking-tight drop-shadow">{dest}</p>
                      </div>
                    </div>

                    {/* ── Card header ── */}
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-title font-semibold text-foreground truncate">{dest}</h3>
                            {trip.isMultiCity && <Badge variant="secondary" className="text-xs shrink-0">Multi-City</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                            {trip.startDate && <span className="inline-flex items-center gap-1"><Calendar size={12} strokeWidth={1.5} className="shrink-0" /> {formatDate(trip.startDate)}{trip.endDate ? ` → ${formatDate(trip.endDate)}` : ""}</span>}
                            <span className="inline-flex items-center gap-1"><Users size={12} strokeWidth={1.5} className="shrink-0" /> {trip.travelers} {trip.travelers === 1 ? "person" : "people"}</span>
                            <span className="inline-flex items-center gap-1"><Coins size={12} strokeWidth={1.5} className="shrink-0" /> €{trip.budget.toLocaleString()} / person</span>
                            <span className="text-muted-foreground">Saved {new Date(trip.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          {trip.priceWatch && (() => {
                            const meta = TREND_META[trip.priceWatch.trend];
                            return (
                              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-xs ${meta.color}`}>
                                <meta.Icon size={11} strokeWidth={1.5} className="shrink-0" />
                                <span className="font-medium">{meta.label}</span>
                                <span className="text-muted-foreground">· {formatDate(trip.priceWatch.lastChecked)}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <Button variant="outline" size="sm" disabled={checkingId !== null} onClick={() => checkPrice(trip)}>
                            {checkingId === trip.id ? "Checking…" : "Check Price"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShare(trip.id)}
                            className={copiedId === trip.id ? "text-green-600 border-green-200 bg-green-50" : ""}
                          >
                            {copiedId === trip.id ? <><Check size={12} strokeWidth={2} /> Copied!</> : "Share"}
                          </Button>
                          <a href={`/api/trips/${trip.id}/calendar`} download>
                            <Button variant="outline" size="sm">
                              <Calendar size={13} strokeWidth={1.5} className="shrink-0" /> Calendar
                            </Button>
                          </a>
                          <div className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingId === trip.id}
                              onClick={() => handleTogglePublic(trip.id)}
                              className={publicState[trip.id] ? "text-brand border-brand/40 bg-brand/5" : ""}
                            >
                              {publicState[trip.id] ? <><Globe2 size={13} strokeWidth={1.5} className="shrink-0" /> Public</> : "Make public"}
                            </Button>
                            {!publicState[trip.id] && (
                              <div className="absolute bottom-full right-0 mb-1.5 w-56 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                Creates a shareable link anyone can view — no login required.
                              </div>
                            )}
                          </div>
                          {publicState[trip.id] && (
                            <button
                              onClick={() => handleShare(trip.id)}
                              className="text-xs text-brand hover:text-brand/80 underline underline-offset-2 whitespace-nowrap"
                              title="Copy public link"
                            >
                              {copiedId === trip.id ? "Copied!" : "Copy link"}
                            </button>
                          )}
                          <button onClick={() => handleDelete(trip.id)} className="text-muted-foreground/60 hover:text-red-400 transition-colors text-xl leading-none p-1" aria-label="Delete trip">×</button>
                        </div>
                      </div>
                    </div>

                    {/* ── Price watcher trace (runs inline, not in a tab) ── */}
                    {(checkingId === trip.id || (priceTraces[trip.id]?.length ?? 0) > 0) && (
                      <div className="border-t border-border px-6 py-4 bg-brand-subtle/50">
                        <AgentTrace trace={priceTraces[trip.id] ?? []} />
                        {verdicts[trip.id] && (
                          <div className="mt-3 rounded-xl bg-surface ring-1 ring-foreground/10 px-4 py-3 text-sm text-foreground leading-relaxed">
                            {verdicts[trip.id]}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Tab strip ── */}
                    <div className="border-t border-border">
                      <div className="flex overflow-x-auto">
                        {TABS.map(t => {
                          const ready = hasContent(trip, t.id);
                          const active = tab === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => openTab(trip.id, t.id)}
                              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                                active
                                  ? "border-brand text-brand bg-brand-subtle"
                                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-brand-subtle"
                              }`}
                            >
                              <t.icon size={13} strokeWidth={1.5} className="shrink-0" />
                              <span>{t.label}</span>
                              {ready && !active && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand absolute top-2.5 right-1.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Tab content ── */}
                    {tab && (
                      <div className="border-t border-border p-4 sm:p-6 bg-surface-sunken">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                      <div className="min-w-0">

                        {/* Ideas */}
                        {tab === "ideas" && (
                          <div className="space-y-4">
                            {(trip.conversations?.length ?? 0) > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Chats · {trip.conversations!.length}
                                  </p>
                                  <button
                                    onClick={() => startNewChat(trip.id)}
                                    className="text-xs font-medium text-brand hover:text-brand/80"
                                  >
                                    + New chat
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {[...trip.conversations!]
                                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                                    .map((thread) => (
                                      <button
                                        key={thread.id}
                                        onClick={() => openConversation(trip.id, thread)}
                                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                                          activeConversationId[trip.id] === thread.id
                                            ? "border-brand bg-brand-subtle text-foreground"
                                            : "border-border bg-surface text-foreground hover:bg-brand-subtle"
                                        }`}
                                      >
                                        <span className="truncate block">{thread.title}</span>
                                        <span className="text-xs text-muted-foreground">{formatDate(thread.updatedAt)}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                            <ConciergeChat
                              messages={conversations[trip.id] ?? []}
                              trace={conciergeTraces[trip.id] ?? []}
                              sending={sendingId === trip.id}
                              onSend={(text, imageUrl) => sendMessage(trip, text, imageUrl)}
                            />
                          </div>
                        )}

                        {/* Plan */}
                        {tab === "plan" && (
                          <>
                            {trip.aiResult ? (
                              <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{trip.aiResult}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-6">No plan content saved.</p>
                            )}
                          </>
                        )}

                        {/* Concierge */}
                        {tab === "concierge" && (
                          <ConciergeChat
                            messages={conversations[trip.id] ?? []}
                            trace={conciergeTraces[trip.id] ?? []}
                            sending={sendingId === trip.id}
                            onSend={(text, imageUrl) => sendMessage(trip, text, imageUrl)}
                          />
                        )}

                        {/* Day Plan */}
                        {tab === "day-plan" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day Planner</p>
                              {trip.dayPlan && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Generated {formatDate(trip.dayPlan.generatedAt)}</span>
                                  <button onClick={() => generateItinerary(trip)} disabled={generatingId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Regenerate</button>
                                </div>
                              )}
                            </div>
                            {generatingId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={itineraryTraces[trip.id] ?? []} />
                                {(itineraryTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Building your day plan…</p>}
                              </div>
                            )}
                            {trip.dayPlan ? (
                              <div className="rounded-xl bg-surface ring-1 ring-foreground/10 p-5"><DayTimeline days={trip.dayPlan.days} /></div>
                            ) : generatingId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">Turn the rough itinerary into a realistic hour-by-hour day plan.</p>
                                <Button size="sm" onClick={() => generateItinerary(trip)} className="flex items-center gap-1.5"><CalendarPlus size={13} strokeWidth={1.5} /> Create Day Plan</Button>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* Briefing */}
                        {tab === "briefing" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Briefing Agent</p>
                              {trip.briefing && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Generated {formatDate(trip.briefing.generatedAt)}</span>
                                  <button onClick={() => generateBriefing(trip)} disabled={generatingBriefingId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Regenerate</button>
                                </div>
                              )}
                            </div>
                            {generatingBriefingId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={briefingTraces[trip.id] ?? []} />
                                {(briefingTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Writing your briefing…</p>}
                              </div>
                            )}
                            {trip.briefing ? (
                              <div className="rounded-xl bg-surface ring-1 ring-foreground/10 p-5"><BriefingCard sections={trip.briefing.sections} /></div>
                            ) : generatingBriefingId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">Get a pre-departure briefing covering prices, weather, practical tips, and highlights.</p>
                                <Button size="sm" onClick={() => generateBriefing(trip)} className="inline-flex items-center gap-1.5"><FileText size={13} strokeWidth={1.5} /> Create Briefing</Button>
                              </div>
                            ) : null}
                            {/* Nearby Places — emitted at start of briefing SSE stream */}
                            {nearbyPlaces[trip.id]?.length ? (
                              <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-1.5"><MapPinned size={12} strokeWidth={1.5} /> Nearby on Google Maps</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {nearbyPlaces[trip.id].map((place, i) => (
                                    <div key={i} className="flex items-start gap-2 rounded-xl bg-surface ring-1 ring-foreground/10 px-3 py-2.5">
                                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold shrink-0 mt-0.5">
                                        {String.fromCharCode(65 + (i % 26))}
                                      </span>
                                      <span className="text-base leading-tight mt-0.5 shrink-0">{place.icon}</span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                                        {place.rating && <p className="text-xs text-amber-500">★ {place.rating}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* Events */}
                        {tab === "events" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events Agent</p>
                              {trip.events && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Found {formatDate(trip.events.generatedAt)}</span>
                                  <button onClick={() => generateEvents(trip)} disabled={generatingEventsId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>
                                </div>
                              )}
                            </div>
                            {generatingEventsId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={eventsTraces[trip.id] ?? []} />
                                {(eventsTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching local events…</p>}
                              </div>
                            )}
                            {trip.events ? (
                              <EventsList events={trip.events.events} />
                            ) : generatingEventsId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">Discover festivals, markets, concerts, and seasonal highlights during your trip.</p>
                                <Button size="sm" onClick={() => generateEvents(trip)} className="flex items-center gap-1.5"><PartyPopper size={13} strokeWidth={1.5} /> Find Events</Button>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* Visa */}
                        {tab === "visa" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visa &amp; Entry Agent</p>
                              {trip.visa && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Checked {formatDate(trip.visa.generatedAt)}</span>
                                  <button onClick={() => generateVisa(trip, visaPassport[trip.id] || trip.visa?.passport || "German")} disabled={generatingVisaId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Re-check</button>
                                </div>
                              )}
                            </div>
                            {generatingVisaId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={visaTraces[trip.id] ?? []} />
                                {(visaTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching entry requirements…</p>}
                              </div>
                            )}
                            {trip.visa ? (
                              <div className="rounded-xl bg-surface ring-1 ring-foreground/10 p-5">
                                <VisaCard requirements={trip.visa.requirements} disclaimer={trip.visa.disclaimer} passport={trip.visa.passport} eVisaActions={trip.visa.eVisaActions} />
                              </div>
                            ) : generatingVisaId !== trip.id ? (
                              <div className="space-y-4 max-w-sm py-2">
                                <p className="text-sm text-muted-foreground">Check visa requirements, health rules, and entry conditions for your passport.</p>
                                <div className="flex gap-2">
                                  <input type="text" placeholder={profilePassport ? `Your passport (e.g. ${profilePassport})` : "Your passport (e.g. German, US, UK)"} value={visaPassport[trip.id] ?? ""} onChange={(e) => setVisaPassport(prev => ({ ...prev, [trip.id]: e.target.value }))} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                                  <Button size="sm" onClick={() => generateVisa(trip, visaPassport[trip.id] || profilePassport || "German")} disabled={generatingVisaId !== null}>Check</Button>
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* Budget */}
                        {tab === "budget" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget Estimator</p>
                              {trip.budgetResult && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">Estimated {formatDate(trip.budgetResult.generatedAt)}</span>
                                  <button onClick={() => generateBudget(trip)} disabled={generatingBudgetId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Re-estimate</button>
                                </div>
                              )}
                            </div>
                            {generatingBudgetId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={budgetTraces[trip.id] ?? []} />
                                {(budgetTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching current prices…</p>}
                              </div>
                            )}
                            {trip.budgetResult ? (
                              <div className="rounded-xl bg-surface ring-1 ring-foreground/10 p-5">
                                <BudgetBreakdown estimate={trip.budgetResult.estimate} userBudget={trip.budget} travelers={trip.travelers} />
                              </div>
                            ) : generatingBudgetId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">Get a realistic cost breakdown — flights, hotel, food, activities, transport — and see if your budget adds up.</p>
                                <Button size="sm" onClick={() => generateBudget(trip)} className="flex items-center gap-1.5"><Coins size={13} strokeWidth={1.5} /> Estimate Budget</Button>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* Weather */}
                        {tab === "weather" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weather Forecast</p>
                              {weatherData[trip.id] && (
                                <button onClick={() => { setWeatherData(prev => { const next = { ...prev }; delete next[trip.id]; return next; }); fetchWeather(trip); }} disabled={loadingWeatherId === trip.id} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>
                              )}
                            </div>
                            {loadingWeatherId === trip.id && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                                <Loader2 size={14} strokeWidth={1.5} className="animate-spin shrink-0" /> Loading weather…
                              </div>
                            )}
                            {weatherError[trip.id] && (
                              <p className="text-sm text-red-500 text-center py-4">{weatherError[trip.id]}</p>
                            )}
                            {weatherData[trip.id] && <WeatherForecast result={weatherData[trip.id]} />}
                          </>
                        )}

                        {/* Culture */}
                        {tab === "culture" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Culture &amp; Etiquette</p>
                              {cultureData[trip.id] && (
                                <button onClick={() => { setCultureData(prev => { const next = { ...prev }; delete next[trip.id]; return next; }); generateCulture(trip); }} disabled={generatingCultureId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>
                              )}
                            </div>
                            {generatingCultureId === trip.id && (
                              <div className="mb-4">
                                <AgentTrace trace={cultureTraces[trip.id] ?? []} />
                                {(cultureTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching local customs…</p>}
                              </div>
                            )}
                            {cultureData[trip.id] ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cultureData[trip.id].items.map((item, i) => (
                                  <div key={i} className="rounded-xl border border-border bg-surface p-4 flex gap-3">
                                    <span className="text-2xl shrink-0">{item.icon}</span>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{item.category}</p>
                                      <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{item.details}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : generatingCultureId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">Key phrases, social etiquette, tipping rules, and dining customs for your destination.</p>
                                <Button size="sm" onClick={() => generateCulture(trip)} className="inline-flex items-center gap-1.5"><Globe size={13} strokeWidth={1.5} /> Get Culture Guide</Button>
                              </div>
                            ) : null}
                          </>
                        )}

                        {/* SIM */}
                        {tab === "sim" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SIM &amp; Connectivity</p>
                              {simData[trip.id] && <button onClick={() => { setSimData(prev => { const n = { ...prev }; delete n[trip.id]; return n; }); generateSim(trip); }} disabled={generatingSimId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>}
                            </div>
                            {generatingSimId === trip.id && (<div className="mb-4"><AgentTrace trace={simTraces[trip.id] ?? []} />{(simTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching connectivity options…</p>}</div>)}
                            {simData[trip.id] ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {simData[trip.id].items.map((item, i) => (
                                  <div key={i} className="rounded-xl border border-border bg-surface p-4 flex gap-3">
                                    <span className="text-2xl shrink-0">{item.icon}</span>
                                    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{item.category}</p><p className="text-sm font-semibold text-foreground mb-1">{item.title}</p><p className="text-xs text-muted-foreground leading-relaxed">{item.details}</p></div>
                                  </div>
                                ))}
                              </div>
                            ) : generatingSimId !== trip.id ? (
                              <div className="text-center py-6"><p className="text-sm text-muted-foreground mb-4">Local SIM options, eSIM providers, data costs, and coverage tips for your destination.</p><Button size="sm" onClick={() => generateSim(trip)} className="inline-flex items-center gap-1.5"><Smartphone size={13} strokeWidth={1.5} /> Get Connectivity Guide</Button></div>
                            ) : null}
                          </>
                        )}

                        {/* Insurance */}
                        {tab === "insurance" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Travel Insurance</p>
                              {insuranceData[trip.id] && <button onClick={() => { setInsuranceData(prev => { const n = { ...prev }; delete n[trip.id]; return n; }); generateInsurance(trip); }} disabled={generatingInsuranceId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>}
                            </div>
                            {generatingInsuranceId === trip.id && (<div className="mb-4"><AgentTrace trace={insuranceTraces[trip.id] ?? []} />{(insuranceTraces[trip.id]?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Researching insurance options…</p>}</div>)}
                            {insuranceData[trip.id] ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {insuranceData[trip.id].items.map((item, i) => (
                                  <div key={i} className="rounded-xl border border-border bg-surface p-4 flex gap-3">
                                    <span className="text-2xl shrink-0">{item.icon}</span>
                                    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{item.category}</p><p className="text-sm font-semibold text-foreground mb-1">{item.title}</p><p className="text-xs text-muted-foreground leading-relaxed">{item.details}</p></div>
                                  </div>
                                ))}
                              </div>
                            ) : generatingInsuranceId !== trip.id ? (
                              <div className="text-center py-6"><p className="text-sm text-muted-foreground mb-4">Recommended coverage types, what to look for, and approx costs for your trip.</p><Button size="sm" onClick={() => generateInsurance(trip)} className="inline-flex items-center gap-1.5"><ShieldCheck size={13} strokeWidth={1.5} /> Get Insurance Guide</Button></div>
                            ) : null}
                          </>
                        )}

                        {/* Timeline */}
                        {tab === "timeline" && (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trip Timeline</p>
                              {timelineData[trip.id] && <button onClick={() => { setTimelineData(prev => { const n = { ...prev }; delete n[trip.id]; return n; }); generateTimeline(trip); }} disabled={generatingTimelineId !== null} className="text-xs font-medium text-brand hover:text-brand/80 disabled:opacity-50">🔄 Refresh</button>}
                            </div>
                            {generatingTimelineId === trip.id && <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center"><Loader2 size={14} strokeWidth={1.5} className="animate-spin shrink-0" /> Parsing your plan…</div>}
                            {timelineData[trip.id] ? (
                              <DayTimeline days={timelineData[trip.id]} />
                            ) : generatingTimelineId !== trip.id ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-4">{trip.aiResult ? "Auto-generate a visual day-by-day timeline from your AI plan." : "Generate an AI plan first, then come back here."}</p>
                                {trip.aiResult && <Button size="sm" onClick={() => generateTimeline(trip)} className="inline-flex items-center gap-1.5"><CalendarDays size={13} strokeWidth={1.5} /> Generate Timeline</Button>}
                              </div>
                            ) : null}
                          </>
                        )}

                      </div>
                      <div className="lg:sticky lg:top-6 h-fit">
                        <TripMap
                          destination={dest}
                          markers={
                            tab === "briefing"
                              ? nearbyPlaces[trip.id]?.map((place, i) => ({
                                  lat: place.lat,
                                  lng: place.lng,
                                  label: String.fromCharCode(65 + (i % 26)),
                                }))
                              : tab === "day-plan"
                              ? trip.dayPlan?.days
                                  .flatMap(d => d.blocks)
                                  .filter((b): b is typeof b & { lat: number; lng: number } => b.lat !== undefined && b.lng !== undefined)
                                  .map((b, i) => ({ lat: b.lat, lng: b.lng, label: String.fromCharCode(65 + (i % 26)) }))
                              : tab === "events"
                              ? trip.events?.events
                                  .filter((e): e is typeof e & { lat: number; lng: number } => e.lat !== undefined && e.lng !== undefined)
                                  .map((e, i) => ({ lat: e.lat, lng: e.lng, label: String.fromCharCode(65 + (i % 26)) }))
                              : undefined
                          }
                        />
                      </div>
                      </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
