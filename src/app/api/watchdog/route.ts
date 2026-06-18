import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 300;

const client = new Anthropic();

// ── Tools (search phase) ──────────────────────────────────────────────────────

const searchTools: Anthropic.Tool[] = [
  {
    name: "search_current_flights",
    description: "Search for current flight prices on a specific route and dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        departure_date: { type: "string" },
        return_date: { type: "string" },
        travelers: { type: "number" },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "search_current_hotels",
    description: "Search for current hotel prices at a destination for given dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string" },
        check_in: { type: "string" },
        check_out: { type: "string" },
        style: { type: "string" },
      },
      required: ["destination"],
    },
  },
];

const reportTool: Anthropic.Tool = {
  name: "report_trend",
  description: "Report the price trend finding after searching.",
  input_schema: {
    type: "object" as const,
    properties: {
      trend: {
        type: "string",
        enum: ["down", "up", "same"],
        description: "Whether prices have gone down, up, or stayed the same.",
      },
      summary: {
        type: "string",
        description: "2-3 sentence English summary of findings, plain prose, no markdown.",
      },
    },
    required: ["trend", "summary"],
  },
};

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const search = async (query: string) => {
    try {
      const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
      return JSON.stringify({ results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })) });
    } catch {
      return JSON.stringify({ error: "Search unavailable", results: [] });
    }
  };

  switch (name) {
    case "search_current_flights": {
      const date = input.departure_date ? ` ${input.departure_date}` : "";
      const ret = input.return_date ? `–${input.return_date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      return search(`current flight prices ${input.origin} to ${input.destination}${date}${ret}${pax} 2026 today`);
    }
    case "search_current_hotels": {
      const style = input.style ? ` ${input.style}` : "";
      const dates = input.check_in ? ` ${input.check_in}–${input.check_out ?? ""}` : "";
      return search(`current${style} hotel prices ${input.destination}${dates} per night 2026`);
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

// ── Core price check (non-streaming) ─────────────────────────────────────────

type TripRow = {
  id: string;
  destination: string;
  cities: string[];
  start_date: string;
  end_date: string;
  travelers: number;
  budget: number;
  price_watch: { trend?: string } | null;
};

async function checkTrip(trip: TripRow): Promise<{ trend: "down" | "up" | "same"; summary: string }> {
  const origin = "Deutschland";
  const userMessage = `
Check current travel prices for this saved trip:
- Route: ${origin} → ${trip.destination}
- Dates: ${trip.start_date} to ${trip.end_date}
- Travelers: ${trip.travelers}
- Budget: €${trip.budget}

Search for current flight and hotel prices, then call report_trend.
`.trim();

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const SYSTEM = `You are a price monitor. Immediately search BOTH tools in parallel: flights and hotels for the given route and dates. Then call report_trend — trend "down" if prices dropped, "up" if higher, "same" if roughly unchanged. summary: 2-3 sentences in English, no markdown.`;

  // Phase 1: search loop
  let iterations = 0;
  while (iterations < 4) {
    iterations++;
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      tools: [...searchTools, reportTool],
      messages,
    });

    if (resp.stop_reason === "tool_use") {
      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      messages.push({ role: "assistant", content: resp.content });

      // If report_trend was called, extract and return
      const reportCall = toolUses.find((t) => t.name === "report_trend");
      if (reportCall) {
        const input = reportCall.input as { trend: "down" | "up" | "same"; summary: string };
        return { trend: input.trend, summary: input.summary };
      }

      // Otherwise execute search tools
      const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: await executeTool(t.name, t.input as Record<string, unknown>),
        }))
      );
      messages.push({ role: "user", content: results });
    } else {
      // end_turn without tool call — force report_trend
      break;
    }
  }

  // Phase 2: force report_trend
  messages.push({ role: "user", content: "Ruf jetzt report_trend auf mit deinen Erkenntnissen." });
  const forced = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM,
    tools: [reportTool],
    tool_choice: { type: "any" },
    messages,
  });

  const reportCall = forced.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_trend");
  if (reportCall) {
    const input = reportCall.input as { trend: "down" | "up" | "same"; summary: string };
    return { trend: input.trend, summary: input.summary };
  }

  return { trend: "same", summary: "Keine aktuellen Preisdaten verfügbar." };
}

// ── Push via ntfy.sh ──────────────────────────────────────────────────────────

const NTFY_TOPIC = "otto-zugstatus-k7m2x9p";

async function sendPush(trip: TripRow, trend: "down" | "up", summary: string): Promise<void> {
  const emoji = trend === "down" ? "✅" : "⚠️";
  const title = `Trip Watchdog: ${trip.destination} ${trend === "down" ? "günstiger geworden" : "teurer geworden"}`;

  await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: "POST",
    headers: { "Title": title, "Content-Type": "text/plain; charset=utf-8" },
    body: summary,
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: rows, error } = await supabaseAdmin
    .from("trips")
    .select("id, destination, cities, start_date, end_date, travelers, budget, price_watch")
    .gte("start_date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; destination: string; trend: string; alerted: boolean }[] = [];

  for (const row of rows ?? []) {
    const trip = row as TripRow;
    let trend: "down" | "up" | "same" = "same";
    let summary = "";

    try {
      ({ trend, summary } = await checkTrip(trip));
    } catch {
      results.push({ id: trip.id, destination: trip.destination, trend: "error", alerted: false });
      continue;
    }

    const alerted = trend !== "same";
    if (trend !== "same") await sendPush(trip, trend, summary);

    await supabaseAdmin
      .from("trips")
      .update({ price_watch: { lastChecked: new Date().toISOString(), trend, summary } })
      .eq("id", trip.id);

    results.push({ id: trip.id, destination: trip.destination, trend, alerted });
  }

  return NextResponse.json({ checked: results.length, results });
}
