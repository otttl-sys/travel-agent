import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_flights",
    description: "Sucht nach Flugverbindungen für eine Destination und einen Zeitraum.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Abflughafen oder Stadt" },
        destination: { type: "string", description: "Zielort" },
        departure_date: { type: "string", description: "Abreisedatum (YYYY-MM-DD)" },
        return_date: { type: "string", description: "Rückreisedatum (YYYY-MM-DD)" },
        travelers: { type: "number", description: "Anzahl Reisende" },
      },
      required: ["destination"],
    },
  },
  {
    name: "search_hotels",
    description: "Sucht nach Hotels und Unterkünften am Reiseziel.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Reiseziel" },
        check_in: { type: "string", description: "Check-in Datum" },
        check_out: { type: "string", description: "Check-out Datum" },
        travelers: { type: "number", description: "Anzahl Personen" },
        style: { type: "string", description: "Unterkunftsstil (budget/comfort/luxury)" },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_activities",
    description: "Findet Aktivitäten, Sehenswürdigkeiten und Erlebnisse am Reiseziel.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Reiseziel" },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Interessen (culture, nature, beach, adventure, food, luxury)",
        },
        duration_days: { type: "number", description: "Reisedauer in Tagen" },
      },
      required: ["destination"],
    },
  },
  {
    name: "optimize_budget",
    description: "Optimiert den Reiseplan auf das vorgegebene Budget.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string" },
        budget_per_person: { type: "number", description: "Budget pro Person in Euro" },
        travelers: { type: "number" },
        duration_days: { type: "number" },
      },
      required: ["destination", "budget_per_person"],
    },
    cache_control: { type: "ephemeral" },
  },
];

// Marks the last content block of the last message as a prompt-cache breakpoint,
// so the (growing) conversation prefix is cached instead of resent at full price
// on the next request in this chain.
function markCacheBreakpoint(messages: Anthropic.MessageParam[]) {
  const last = messages[messages.length - 1];
  if (!last) return;
  if (typeof last.content === "string") {
    last.content = [{ type: "text", text: last.content, cache_control: { type: "ephemeral" } }];
  } else if (Array.isArray(last.content) && last.content.length > 0) {
    const lastBlock = last.content[last.content.length - 1] as { cache_control?: unknown };
    lastBlock.cache_control = { type: "ephemeral" };
  }
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  switch (name) {
    case "search_flights": {
      const origin = input.origin ? ` from ${input.origin}` : "";
      const date = input.departure_date ? ` ${input.departure_date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      const query = `flights to ${input.destination}${origin}${date}${pax} price`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "search_hotels": {
      const style = input.style ? ` ${input.style}` : "";
      const date = input.check_in ? ` ${input.check_in}` : "";
      const query = `best${style} hotels in ${input.destination}${date} recommendations`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "get_activities": {
      const interests = Array.isArray(input.interests) && input.interests.length > 0
        ? ` ${(input.interests as string[]).join(", ")}`
        : "";
      const days = input.duration_days ? ` ${input.duration_days} days` : "";
      const query = `top things to do${interests} in ${input.destination}${days} attractions`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "optimize_budget":
      return JSON.stringify({
        breakdown: {
          flights: Math.floor((input.budget_per_person as number) * 0.35),
          hotel: Math.floor((input.budget_per_person as number) * 0.35),
          activities: Math.floor((input.budget_per_person as number) * 0.15),
          food: Math.floor((input.budget_per_person as number) * 0.10),
          transport: Math.floor((input.budget_per_person as number) * 0.05),
        },
        total: input.budget_per_person,
        savings_tip: "Frühbucherrabatte für Flüge sparen bis zu 25%",
      });
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const multiCityTools: Anthropic.Tool[] = [
  {
    name: "search_flight_leg",
    description: "Search flights for one leg of a multi-city journey (origin to destination).",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Departure city or airport" },
        destination: { type: "string", description: "Arrival city or airport" },
        date: { type: "string", description: "Travel date (YYYY-MM-DD or approximate)" },
        travelers: { type: "number" },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "plan_city_stop",
    description: "Find hotels and activities for one city stop in a multi-city journey.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: { type: "string" },
        duration_days: { type: "number" },
        interests: { type: "array", items: { type: "string" } },
        style: { type: "string", description: "budget / comfort / luxury" },
      },
      required: ["city"],
    },
  },
  {
    name: "optimize_total_budget",
    description: "Optimize budget allocation across the entire multi-city journey.",
    input_schema: {
      type: "object" as const,
      properties: {
        cities: { type: "array", items: { type: "string" } },
        total_days: { type: "number" },
        budget_per_person: { type: "number" },
        travelers: { type: "number" },
      },
      required: ["cities", "budget_per_person"],
    },
    cache_control: { type: "ephemeral" },
  },
];

async function executeMultiCityTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const search = async (query: string) => {
    try {
      const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
      return JSON.stringify({ query, results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })) });
    } catch {
      return JSON.stringify({ query, error: "Search unavailable", results: [] });
    }
  };

  switch (name) {
    case "search_flight_leg": {
      const date = input.date ? ` ${input.date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      return search(`flights from ${input.origin} to ${input.destination}${date}${pax} price`);
    }
    case "plan_city_stop": {
      const days = input.duration_days ? ` ${input.duration_days} days` : "";
      const interests = Array.isArray(input.interests) && input.interests.length > 0
        ? ` ${(input.interests as string[]).join(", ")}`
        : "";
      const style = input.style ? ` ${input.style}` : "";
      const [hotels, activities] = await Promise.all([
        search(`best${style} hotels in ${input.city}${days} recommendations`),
        search(`top things to do${interests} in ${input.city}${days} attractions`),
      ]);
      return JSON.stringify({ city: input.city, hotels: JSON.parse(hotels), activities: JSON.parse(activities) });
    }
    case "optimize_total_budget": {
      const cities = Array.isArray(input.cities) ? (input.cities as string[]) : [];
      const budget = input.budget_per_person as number;
      const days = input.total_days as number || cities.length * 3;
      const perDay = Math.floor(budget / days);
      return JSON.stringify({
        total_budget: budget,
        total_days: days,
        per_day_budget: perDay,
        city_allocations: cities.map((c) => ({ city: c, daily_budget: perDay })),
        savings_tip: "Book inter-city trains/flights early for up to 40% savings.",
      });
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers, interests, budget, cities, cityDays, multiCity } = await req.json();

  const isMultiCity = multiCity === "1" || multiCity === true;
  const cityList: string[] = isMultiCity && cities ? (Array.isArray(cities) ? cities : String(cities).split(",")) : [];
  const daysList: number[] = isMultiCity && cityDays
    ? (Array.isArray(cityDays) ? cityDays.map(Number) : String(cityDays).split(",").map(Number))
    : cityList.map(() => 3);

  const activeTools = isMultiCity ? multiCityTools : tools;

  const cityCount = cityList.length;
  const legCount = cityCount + 1; // outbound + inter-city legs + return

  const multiCitySystemPrompt = `You are a multi-city travel planning agent. Your goal is to plan the complete journey as fast as possible.

CRITICAL RULE — PARALLEL TOOL CALLS:
In your FIRST response, you MUST call ALL tools simultaneously in a single batch. Do NOT call tools one at a time.

For a ${cityCount}-city trip you must call exactly ${legCount + cityCount + 1} tools in parallel in one shot:
- ${legCount} × search_flight_leg (one per flight leg including return)
- ${cityCount} × plan_city_stop (one per city)
- 1 × optimize_total_budget

Fire all ${legCount + cityCount + 1} tool calls in your very first response. Then write the final travel plan after receiving all results.`;

  const userMessage = isMultiCity
    ? `
Plane eine Multi-City Reise:
- Route: ${cityList.map((c, i) => `${c} (${daysList[i] ?? 3} Tage)`).join(" → ")}
- Abreise: ${startDate || "flexibel"}
- Reisende: ${travelers || 2} Person(en)
- Interessen: ${interests || "allgemein"}
- Budget pro Person (gesamt): €${budget || 3000}

WICHTIG: Rufe ALLE Tools gleichzeitig in einem einzigen Batch auf — nicht sequenziell.
Erstelle danach einen detaillierten Tag-für-Tag Reiseplan auf Deutsch.
`.trim()
    : `
Plane eine Reise mit folgenden Wünschen:
- Destination: ${destination || "flexibel"}
- Zeitraum: ${startDate || "flexibel"} bis ${endDate || "flexibel"}
- Reisende: ${travelers || 2} Person(en)
- Interessen: ${interests || "allgemein"}
- Budget pro Person: €${budget || 3000}

Nutze die verfügbaren Tools um Flüge, Hotels, Aktivitäten zu analysieren und das Budget zu optimieren.
Erstelle dann einen konkreten, strukturierten Reisevorschlag auf Deutsch.
`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [
          { role: "user", content: userMessage },
        ];

        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 10;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          // From the 2nd call onward, cache the conversation prefix built up so far
          // (tool results + prior assistant text) instead of resending it at full price.
          if (iterations > 1) markCacheBreakpoint(messages);

          // Stream every Claude call — text tokens arrive live, tool_use detected after
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: isMultiCity ? 8192 : 4096,
            ...(isMultiCity && iterations === 1
              ? { system: [{ type: "text" as const, text: multiCitySystemPrompt, cache_control: { type: "ephemeral" as const } }] }
              : {}),
            tools: activeTools,
            messages,
          });

          // Forward text tokens to client as they arrive
          stream.on("text", (text) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`)
            );
          });

          // Wait for full message (needed for tool_use input blocks)
          const finalMessage = await stream.finalMessage();

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
                const content = isMultiCity
                  ? await executeMultiCityTool(toolUse.name, toolUse.input as Record<string, unknown>)
                  : await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: toolUse.id, tool: toolUse.name })}\n\n`)
                );
                return {
                  type: "tool_result" as const,
                  tool_use_id: toolUse.id,
                  content,
                };
              })
            );

            messages.push({ role: "user", content: toolResults });
          } else {
            // Text was already streamed token-by-token via stream.on("text")
            const fullText = finalMessage.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "result", text: fullText })}\n\n`)
            );
            continueLoop = false;

            // Generate dynamic trip cards (single-city only, parallel with no extra Tavily calls)
            if (!isMultiCity) {
              try {
                const GRADIENTS = [
                  "from-rose-400 to-orange-300",
                  "from-emerald-400 to-teal-300",
                  "from-violet-400 to-indigo-300",
                  "from-amber-400 to-yellow-300",
                  "from-sky-400 to-blue-300",
                  "from-green-500 to-lime-400",
                  "from-pink-400 to-rose-300",
                  "from-cyan-400 to-sky-300",
                ];
                const cardTool: Anthropic.Tool = {
                  name: "generate_trip_cards",
                  description: "Generate 3 structured trip card options based on the travel plan already created.",
                  input_schema: {
                    type: "object" as const,
                    properties: {
                      cards: {
                        type: "array",
                        minItems: 3,
                        maxItems: 3,
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            destination: { type: "string" },
                            tagline: { type: "string", description: "Short catchy tagline, max 5 words" },
                            description: { type: "string", description: "2 sentences max" },
                            price: { type: "number", description: "Estimated total price per person in EUR" },
                            duration: { type: "string", description: "e.g. '10 Tage'" },
                            themes: { type: "array", items: { type: "string" }, description: "2-3 theme tags in German" },
                            highlights: { type: "array", items: { type: "string" }, description: "4 highlights in German" },
                            gradient: { type: "string", enum: GRADIENTS },
                            emoji: { type: "string", description: "Single emoji representing the destination" },
                            itinerary: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  day: { type: "string" },
                                  activities: { type: "array", items: { type: "string" } },
                                },
                              },
                              description: "4-5 day-blocks",
                            },
                            budget: {
                              type: "object",
                              properties: {
                                flights: { type: "number" },
                                hotel: { type: "number" },
                                activities: { type: "number" },
                                food: { type: "number" },
                              },
                            },
                            bookingUrl: { type: "string", description: "Google Flights URL for this destination" },
                          },
                          required: ["id", "destination", "tagline", "description", "price", "duration", "themes", "highlights", "gradient", "emoji", "itinerary", "budget", "bookingUrl"],
                        },
                      },
                    },
                    required: ["cards"],
                  },
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "cards", tool: "generate_trip_cards", input: { destination }, iteration: iterations + 1 })}\n\n`)
                );

                const cardMessages: Anthropic.MessageParam[] = [
                  ...messages,
                  { role: "assistant", content: finalMessage.content },
                  {
                    role: "user",
                    content: `Based on the travel plan above, generate 3 different trip card options for ${destination}. Vary the style: one budget-friendly, one balanced, one premium. All prices realistic for the destination. Use German for all text fields. bookingUrl should be a Google Flights search URL.`,
                  },
                ];

                const cardResponse = await client.messages.create({
                  model: "claude-sonnet-4-6",
                  max_tokens: 4096,
                  tool_choice: { type: "any" },
                  tools: [cardTool],
                  messages: cardMessages,
                });

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "cards", tool: "generate_trip_cards" })}\n\n`)
                );

                const cardBlock = cardResponse.content.find(
                  (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_trip_cards"
                );
                if (cardBlock) {
                  const cards = (cardBlock.input as { cards: unknown[] }).cards;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "cards", cards })}\n\n`)
                  );
                }
              } catch {
                // Card generation failure is non-fatal — frontend falls back to mock cards
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
