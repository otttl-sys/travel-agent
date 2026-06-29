import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { geocode, searchNearby } from "@/lib/google-maps";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_logistics",
  description: "Search the web for opening hours, typical visit duration, and travel logistics for a destination's activities and sights.",
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
    case "search_logistics":
      return search(String(input.query ?? ""));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

type DayBlock = { day: string; activities: string[] };

const SYSTEM_PROMPT = `You are a meticulous day-planning specialist. Your job: turn rough thematic day blocks from a saved trip into a realistic hour-by-hour day plan.

Work in two steps:
1. REQUIRED: Call search_logistics at least 2 times first (e.g. opening hours of key sights, typical visit duration, transit logistics, restaurant recommendations at the destination) — before doing anything else. Your time estimates must be grounded in these research results, not guesswork. Never skip this step.
2. Then call generate_day_schedule EXACTLY ONCE — one entry per existing day block (if none exist, create a sensible 3–5 day structure matching the destination and themes), each laid out as a morning-to-evening sequence (arrival/breakfast, main activities, lunch break, further sights, dinner etc.).

For each time block:
- time: approximate time (e.g. "ca. 09:00") — phrased as a suggestion, not a guarantee
- activity: the activity, short and concrete
- note: optional short practical hint (duration, walking time to next stop, tip) — brief, in English

Be realistic: build in breaks, don't underestimate travel times, don't overload any day.`;

export async function POST(req: NextRequest) {
  const { destination, themes, itinerary } = await req.json() as {
    destination?: string;
    themes?: string[];
    itinerary?: DayBlock[];
  };

  const days = itinerary ?? [];
  const themeStr = themes?.length ? themes.join(", ") : "—";
  const dayBlocksStr = days.length
    ? days.map((d) => `${d.day}: ${d.activities.join(", ")}`).join("\n")
    : "Keine Tagesblöcke hinterlegt.";

  // Fetch real venues from Google Maps to ground the schedule in actual places
  let venuesContext = "";
  try {
    const { latlng } = await geocode(destination ?? "");
    const [attractions, restaurants] = await Promise.all([
      searchNearby(latlng, "tourist_attraction", 8),
      searchNearby(latlng, "restaurant", 5),
    ]);
    const all = [...attractions, ...restaurants];
    if (all.length) {
      venuesContext = "\n\nVerfügbare Orte aus Google Maps (verwende diese für konkrete Empfehlungen — echte Namen, echte Adressen, echte Koordinaten):\n"
        + all.map(p => `${p.icon} ${p.name}${p.rating ? ` ★${p.rating}` : ""} — ${p.address} (lat: ${p.lat}, lng: ${p.lng})`).join("\n");
    }
  } catch { /* non-fatal — continue without places */ }

  const userMessage = `
Create an hour-by-hour day plan for this trip:
- Destination: ${destination ?? "unknown"}
- Themes: ${themeStr}
- Existing day blocks:
${dayBlocksStr}

First research the logistics (opening hours, visit duration, transit), then create the complete day plan with generate_day_schedule — one entry per day block.${venuesContext}
`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 4;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          const apiStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
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

            // Phase 2 — forced structured output: build the actual hour-by-hour schedule
            try {
              const scheduleTool: Anthropic.Tool = {
                name: "generate_day_schedule",
                description: "Generate the final structured hour-by-hour day schedule for the trip.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    days: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          day: { type: "string" },
                          blocks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                time: { type: "string", description: "e.g. 'ca. 09:00'" },
                                activity: { type: "string" },
                                note: { type: "string" },
                                lat: { type: "number", description: "Latitude of the activity's venue, ONLY if it matches one of the 'Verfügbare Orte' from Google Maps — copy the exact coordinate, otherwise omit" },
                                lng: { type: "number", description: "Longitude of the activity's venue, ONLY if it matches one of the 'Verfügbare Orte' from Google Maps — copy the exact coordinate, otherwise omit" },
                              },
                              required: ["time", "activity"],
                            },
                          },
                        },
                        required: ["day", "blocks"],
                      },
                    },
                  },
                  required: ["days"],
                },
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "schedule", tool: "generate_day_schedule", input: { destination }, iteration: iterations + 1 })}\n\n`)
              );

              const scheduleResponse = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                tool_choice: { type: "any" },
                tools: [scheduleTool],
                messages: [
                  ...messages,
                  { role: "assistant", content: finalMessage.content },
                  {
                    role: "user",
                    content: "Now create the complete hour-by-hour day schedule with generate_day_schedule — one entry per existing day block, in English.",
                  },
                ],
              });

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "schedule", tool: "generate_day_schedule" })}\n\n`)
              );

              const scheduleBlock = scheduleResponse.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_day_schedule"
              );
              const result = scheduleBlock ? (scheduleBlock.input as { days?: unknown[] }).days : undefined;
              if (Array.isArray(result) && result.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "schedule", days: result })}\n\n`)
                );
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Tagesplan konnte nicht erstellt werden." })}\n\n`)
                );
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : "Tagesplan konnte nicht erstellt werden.";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
            }
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
