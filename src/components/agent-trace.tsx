export type TraceEntry = {
  id: string;
  iteration: number;
  tool: string;
  input: Record<string, unknown>;
  status: "running" | "done";
};

export const AGENT_META: Record<string, { agent: string; icon: string }> = {
  search_flights: { agent: "Flight Agent", icon: "✈️" },
  search_hotels: { agent: "Hotel Agent", icon: "🏨" },
  get_activities: { agent: "Activity Agent", icon: "🎒" },
  optimize_budget: { agent: "Budget Agent", icon: "💰" },
  search_flight_leg: { agent: "Flight Agent", icon: "✈️" },
  plan_city_stop: { agent: "City Agent", icon: "🏙️" },
  optimize_total_budget: { agent: "Budget Agent", icon: "💰" },
  generate_trip_cards: { agent: "Card Designer", icon: "🎴" },
  search_current_flights: { agent: "Price Agent", icon: "📉" },
  search_current_hotels: { agent: "Price Agent", icon: "📉" },
  search_live_info: { agent: "Concierge", icon: "💬" },
  search_logistics: { agent: "Day Planner", icon: "🗓️" },
  search_travel_essentials: { agent: "Briefing Agent", icon: "📋" },
};

export function formatToolParams(tool: string, input: Record<string, unknown>): string {
  const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
  const range = (a: unknown, b: unknown) => [str(a), str(b)].filter(Boolean).join("–") || null;
  const list = (v: unknown) => (Array.isArray(v) && v.length > 0 ? v.join(", ") : null);
  const route = (a: unknown, b: unknown) => (str(a) && str(b) ? `${str(a)} → ${str(b)}` : str(b));
  const days = (v: unknown) => (str(v) ? `${v} Tage` : null);
  const pax = (v: unknown) => (str(v) ? `${v} Reisende` : null);

  let parts: (string | null)[];
  switch (tool) {
    case "search_flights":
      parts = [route(input.origin, input.destination), range(input.departure_date, input.return_date), pax(input.travelers)];
      break;
    case "search_hotels":
      parts = [str(input.destination), range(input.check_in, input.check_out), str(input.style)];
      break;
    case "get_activities":
      parts = [str(input.destination), days(input.duration_days), list(input.interests)];
      break;
    case "optimize_budget":
      parts = [str(input.destination), str(input.budget_per_person) ? `€${input.budget_per_person} p.P.` : null, pax(input.travelers)];
      break;
    case "search_flight_leg":
      parts = [route(input.origin, input.destination), str(input.date), pax(input.travelers)];
      break;
    case "plan_city_stop":
      parts = [str(input.city), days(input.duration_days), str(input.style) ?? list(input.interests)];
      break;
    case "optimize_total_budget":
      parts = [list(input.cities), str(input.total_days) ? `${input.total_days} Tage gesamt` : null, str(input.budget_per_person) ? `€${input.budget_per_person} p.P.` : null];
      break;
    case "generate_trip_cards":
      parts = [str(input.destination), "3 Varianten"];
      break;
    case "search_current_flights":
      parts = [route(input.origin, input.destination), range(input.departure_date, input.return_date), pax(input.travelers)];
      break;
    case "search_current_hotels":
      parts = [str(input.destination), range(input.check_in, input.check_out), str(input.style)];
      break;
    case "search_live_info":
    case "search_logistics":
    case "search_travel_essentials":
      parts = [str(input.query)];
      break;
    default:
      parts = Object.values(input).slice(0, 3).map(str);
  }
  return parts.filter((p): p is string => Boolean(p)).join(" · ");
}

export function AgentTrace({ trace }: { trace: TraceEntry[] }) {
  if (trace.length === 0) return null;
  const rounds = Array.from(new Set(trace.map((t) => t.iteration))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const entries = trace.filter((t) => t.iteration === round);
        return (
          <div key={round}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Runde {round}
              {entries.length > 1 ? " — parallel ausgeführt" : ""}
            </p>
            <div className="space-y-1.5">
              {entries.map((entry) => {
                const meta = AGENT_META[entry.tool] ?? { agent: entry.tool, icon: "🤖" };
                const params = formatToolParams(entry.tool, entry.input);
                return (
                  <div key={entry.id} className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-base leading-none shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-700">{meta.agent}</span>
                      <span className="text-gray-400"> · </span>
                      <span className="text-gray-500 break-words">
                        {entry.tool}
                        {params ? `(${params})` : ""}
                      </span>
                    </div>
                    <span className="ml-auto shrink-0 pl-2 mt-1">
                      {entry.status === "running" ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" aria-label="läuft" />
                      ) : (
                        <span className="text-green-600 text-xs font-bold" aria-label="fertig">✓</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
