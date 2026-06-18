import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import type { NearbyPlace } from "@/lib/google-maps";
import type { EventItem } from "@/components/events-list";

export const maxDuration = 300;

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_live_info",
    description: "Search the web for current, time-sensitive information — weather, events, opening hours, prices, local news.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "A focused search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "show_nearby_places",
    description: "Show the traveler a visual list of nearby attractions, restaurants, museums and other points of interest around their destination. Call this when the user asks what there is to see or do, where to eat, or for sightseeing/restaurant recommendations — and nearby places data is available.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "show_events",
    description: "Show the traveler a visual list of events, concerts, festivals or exhibitions happening during their trip. Call this when the user asks about events, things happening, concerts or festivals — and event data is available.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

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
    case "search_live_info":
      return search(String(input.query ?? ""));
    case "show_nearby_places":
      return JSON.stringify({ ok: true, note: "Places card shown to the traveler. Don't repeat the full list as text — just add a short remark." });
    case "show_events":
      return JSON.stringify({ ok: true, note: "Events card shown to the traveler. Don't repeat the full list as text — just add a short remark." });
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

type TripContext = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelers?: number;
  themes?: string[];
  itinerary?: { day: string; activities: string[] }[];
  nearbyPlaces?: NearbyPlace[];
  events?: EventItem[];
};

function buildSystemPrompt(trip: TripContext): string {
  const themes = trip.themes?.length ? trip.themes.join(", ") : "—";
  const itinerary = trip.itinerary?.length
    ? trip.itinerary.map((d) => `${d.day}: ${d.activities.join(", ")}`).join("\n")
    : "Noch kein detailliertes Tagesprogramm hinterlegt.";
  const hasPlaces = (trip.nearbyPlaces?.length ?? 0) > 0;
  const hasEvents = (trip.events?.length ?? 0) > 0;

  return `Du bist der persönliche Reise-Concierge des Travelers für seine gespeicherte Reise. Du kennst diese Reise im Detail:

- Ziel: ${trip.destination ?? "unbekannt"}
- Zeitraum: ${trip.startDate || "flexibel"} bis ${trip.endDate || "flexibel"}
- Reisende: ${trip.travelers ?? 2} Person(en)
- Themen: ${themes}
- Geplantes Programm:
${itinerary}
- Nearby-Places-Daten verfügbar: ${hasPlaces ? "ja" : "nein"}
- Events-Daten verfügbar: ${hasEvents ? "ja" : "nein"}

Answer the traveler's questions about this trip warmly, knowledgeably, and in English — like a well-informed friend, not a report:
- Write in flowing, short paragraphs. NO Markdown — no headings, tables, bullet points, or asterisks.
- Use search_live_info ONLY when the question needs current/time-sensitive info (weather, events, opening hours, prices, news). Otherwise answer directly from the trip context and your knowledge — without a tool call.
- When the traveler asks about sights, restaurants or activities AND nearby-places data is available, call show_nearby_places — the cards are shown visually, you don't need to repeat the list as text.
- When the traveler asks about events, concerts or festivals during the trip AND events data is available, call show_events — same principle.
- Keep answers concise: typically 2-5 sentences, more detailed only for specific questions.
- Reference the trip's planned itinerary concretely where relevant.`;
}

export async function POST(req: NextRequest) {
  const { trip, messages: history } = await req.json() as {
    trip: TripContext;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const systemPrompt = buildSystemPrompt(trip ?? {});

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 4;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          const apiStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages,
          });

          apiStream.on("text", (text) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`));
          });

          const finalMessage = await apiStream.finalMessage();

          if (finalMessage.stop_reason === "tool_use") {
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            messages.push({ role: "assistant", content: finalMessage.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: toolUse.id, tool: toolUse.name, input: toolUse.input, iteration: iterations })}\n\n`)
                );
                if (toolUse.name === "show_nearby_places" && trip?.nearbyPlaces?.length) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "card", card: "places", items: trip.nearbyPlaces })}\n\n`)
                  );
                }
                if (toolUse.name === "show_events" && trip?.events?.length) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "card", card: "events", items: trip.events })}\n\n`)
                  );
                }
                const content = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: toolUse.id, tool: toolUse.name })}\n\n`)
                );
                return { type: "tool_result" as const, tool_use_id: toolUse.id, content };
              })
            );

            messages.push({ role: "user", content: toolResults });
          } else {
            const fullText = finalMessage.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", text: fullText })}\n\n`));
            continueLoop = false;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
