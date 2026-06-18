import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { geocode, searchNearby, type NearbyPlace } from "@/lib/google-maps";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_travel_essentials",
  description: "Search the web for current weather/season outlook, practical pre-departure tips, or travel basics for a destination.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "A focused search query" },
    },
    required: ["query"],
  },
};

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
    case "search_travel_essentials":
      return search(String(input.query ?? ""));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const SYSTEM_PROMPT = `You are a briefing specialist who creates ONE cohesive pre-trip briefing for a saved trip — drawing on insights from other travel agents (price trend, day plan) and fresh research. Think "everything you need to know before departure", written warmly like an experienced travel companion, not a dry checklist.

Work in two steps:
1. Call search_travel_essentials 1-2 times to fill gaps NOT already covered by the provided price-trend or day-plan data — e.g. current weather/season, practical last-minute tips (visa, currency, transport, health). IMPORTANT: If no price trend or day plan was provided, research a suitable replacement yourself (e.g. current price benchmarks or a sensible daily structure) — NEVER state that data is "unavailable". The finished briefing should always feel complete and confident.
2. Then call generate_briefing EXACTLY ONCE — with 3-5 sections that weave everything into a coherent whole (not separate data blocks placed side by side).

For each section:
- icon: a fitting emoji
- title: a short, inviting title in English (e.g. "Prices at a Glance", "Your Daily Rhythm", "Weather & Packing", "On the Ground")
- body: 2-4 sentences of flowing prose in English, NO Markdown, NO bullet points — warm, concrete, personally phrased ("You'll find...", "Budget time for...")

Typical topics (pick the 3-5 most relevant based on available data): price trends & booking timing, day schedule overview, weather & what to pack, practical on-the-ground tips, cultural/seasonal highlights.`;

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers, themes, priceWatch, dayPlanSummary } = await req.json() as {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    themes?: string[];
    priceWatch?: { trend: string; summary: string };
    dayPlanSummary?: string[];
  };

  const themeStr = themes?.length ? themes.join(", ") : "—";
  const priceStr = priceWatch
    ? `Price trend: ${priceWatch.trend} — ${priceWatch.summary}`
    : "No price trend saved yet (Price Watcher hasn't run) — please research a current price estimate for this destination yourself.";
  const dayPlanStr = dayPlanSummary?.length
    ? dayPlanSummary.join("; ")
    : "No day plan saved yet (Day Planner hasn't run) — please research a sensible rough daily structure for this destination yourself.";

  const userMessage = `
Create a pre-trip briefing for this trip:
- Destination: ${destination ?? "unknown"}
- Travel dates: ${startDate ?? "?"} – ${endDate ?? "?"}
- Travelers: ${travelers ?? "?"}
- Themes: ${themeStr}
- ${priceStr}
- Day plan overview: ${dayPlanStr}

First research the missing pieces (weather, practical tips, substitute research for missing data), then create the complete briefing with generate_briefing — 3-5 cohesive sections.
`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Fetch nearby places and emit immediately — independent of the briefing generation
      let nearbyPlaces: NearbyPlace[] = [];
      try {
        const { latlng } = await geocode(destination ?? "");
        const [attractions, restaurants, museums] = await Promise.all([
          searchNearby(latlng, "tourist_attraction", 5),
          searchNearby(latlng, "restaurant", 4),
          searchNearby(latlng, "museum", 3),
        ]);
        nearbyPlaces = [...attractions, ...museums, ...restaurants];
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "nearby_places", places: nearbyPlaces })}\n\n`));
      } catch { /* non-fatal */ }

      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 4;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          const apiStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1536,
            system: SYSTEM_PROMPT,
            tools: [searchTool],
            messages,
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
                const content = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: toolUse.id, tool: toolUse.name })}\n\n`)
                );
                return { type: "tool_result" as const, tool_use_id: toolUse.id, content };
              })
            );

            messages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;

            // Phase 2 — forced structured output: synthesize the final briefing
            try {
              const briefingTool: Anthropic.Tool = {
                name: "generate_briefing",
                description: "Generate the final structured pre-departure briefing for the trip.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          icon: { type: "string", description: "A fitting emoji" },
                          title: { type: "string" },
                          body: { type: "string", description: "2-4 sentences of flowing prose, no markdown" },
                        },
                        required: ["icon", "title", "body"],
                      },
                    },
                  },
                  required: ["sections"],
                },
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "briefing", tool: "generate_briefing", input: { destination }, iteration: iterations + 1 })}\n\n`)
              );

              const briefingResponse = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                tool_choice: { type: "any" },
                tools: [briefingTool],
                messages: [
                  ...messages,
                  { role: "assistant", content: finalMessage.content },
                  {
                    role: "user",
                    content: "Now create the complete briefing with generate_briefing — 3-5 cohesive sections in English.",
                  },
                ],
              });

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "briefing", tool: "generate_briefing" })}\n\n`)
              );

              const briefingBlock = briefingResponse.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_briefing"
              );
              const result = briefingBlock ? (briefingBlock.input as { sections?: unknown[] }).sections : undefined;
              if (Array.isArray(result) && result.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "briefing", sections: result })}\n\n`)
                );
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Briefing konnte nicht erstellt werden." })}\n\n`)
                );
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : "Briefing konnte nicht erstellt werden.";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        void nearbyPlaces; // suppress unused warning
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
