import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { searchAmadeusFlights, searchAmadeusHotels, searchAmadeusActivities, cityToIATA } from "@/lib/amadeus";

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
        style: { type: "string", description: "Unterkunftsstil — kombiniere alle zutreffenden: budget, comfort, luxury, wellness, spa, boutique. z.B. 'luxury wellness spa' wenn beides gewünscht." },
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
      // Try Amadeus for real prices first
      if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        try {
          const result = await searchAmadeusFlights({
            origin: String(input.origin || "Berlin"),
            destination: String(input.destination),
            departureDate: input.departure_date ? String(input.departure_date) : undefined,
            returnDate: input.return_date ? String(input.return_date) : undefined,
            adults: Number(input.travelers) || 1,
          });
          return JSON.stringify({ destination: input.destination, ...result });
        } catch {
          // Fall through to Tavily
        }
      }
      // Fallback: Tavily search
      const origin = input.origin ? ` from ${input.origin}` : "";
      const date = input.departure_date ? ` ${input.departure_date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      const query = `flights to ${input.destination}${origin}${date}${pax} price`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          source: "tavily",
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "search_hotels": {
      // Try Amadeus for real hotel prices first
      if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        try {
          const result = await searchAmadeusHotels({
            destination: String(input.destination),
            checkIn: input.check_in ? String(input.check_in) : undefined,
            checkOut: input.check_out ? String(input.check_out) : undefined,
            adults: Number(input.travelers) || 1,
            style: input.style ? String(input.style) : undefined,
          });
          return JSON.stringify(result);
        } catch {
          // Fall through to Tavily
        }
      }
      // Fallback: Tavily search
      const style = input.style ? ` ${input.style}` : "";
      const date = input.check_in ? ` ${input.check_in}` : "";
      const query = `best${style} hotels in ${input.destination}${date} recommendations`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          source: "tavily",
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "get_activities": {
      // Try Amadeus Tours & Activities first
      if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        try {
          const result = await searchAmadeusActivities({
            destination: String(input.destination),
            interests: Array.isArray(input.interests) ? (input.interests as string[]) : [],
            durationDays: input.duration_days ? Number(input.duration_days) : undefined,
          });
          return JSON.stringify(result);
        } catch {
          // Fall through to Tavily
        }
      }
      // Fallback: Tavily search
      const interests = Array.isArray(input.interests) && input.interests.length > 0
        ? ` ${(input.interests as string[]).join(", ")}`
        : "";
      const days = input.duration_days ? ` ${input.duration_days} days` : "";
      const query = `top things to do${interests} in ${input.destination}${days} attractions`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
        return JSON.stringify({
          destination: input.destination,
          source: "tavily",
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
      if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        try {
          const result = await searchAmadeusFlights({
            origin: String(input.origin),
            destination: String(input.destination),
            departureDate: input.date ? String(input.date) : undefined,
            adults: Number(input.travelers) || 1,
          });
          return JSON.stringify({ origin: input.origin, destination: input.destination, ...result });
        } catch {
          // Fall through to Tavily
        }
      }
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

type Child = { age: number; gender: "boy" | "girl" | "unspecified" };

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers, interests, budget, cities, cityDays, multiCity, origin, budgetMode, adventure, includeFlights, includeHotel, children: childrenRaw, language } = await req.json();
  const adventureMode = adventure === "1" || adventure === true;
  const interestsList: string[] = interests ? String(interests).split(",").map((s: string) => s.trim()) : [];
  const familyMode = interestsList.includes("family");
  let childrenList: Child[] = [];
  if (childrenRaw) {
    try { childrenList = typeof childrenRaw === "string" ? JSON.parse(childrenRaw) : childrenRaw; } catch { /* ignore */ }
  }
  const flightsIncluded = includeFlights !== false && budgetMode !== "activities-only";
  const hotelIncluded = includeHotel !== false && budgetMode !== "activities-only";
  const budgetNote = !flightsIncluded && !hotelIncluded
    ? " (activities & local transport only — NO flights or hotel)"
    : !flightsIncluded
      ? " (hotel IS included, flights are NOT in this budget)"
      : !hotelIncluded
        ? " (flights ARE included, hotel is NOT in this budget)"
        : " (total including flights and hotel)";

  const isMultiCity = multiCity === "1" || multiCity === true;
  const cityList: string[] = isMultiCity && cities ? (Array.isArray(cities) ? cities : String(cities).split(",")) : [];
  const daysList: number[] = isMultiCity && cityDays
    ? (Array.isArray(cityDays) ? cityDays.map(Number) : String(cityDays).split(",").map(Number))
    : cityList.map(() => 3);

  const activeTools = isMultiCity ? multiCityTools : tools;

  const cityCount = cityList.length;
  const legCount = cityCount + 1; // outbound + inter-city legs + return

  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish",
  };
  const planLanguage = typeof language === "string" && language in LANGUAGE_NAMES ? language : "en";
  const languageName = LANGUAGE_NAMES[planLanguage];
  const languageAddition = planLanguage !== "en"
    ? `\n\nLANGUAGE: Write the ENTIRE travel plan in ${languageName}. Every heading, description, recommendation, price note, and practical tip must be in ${languageName}. Do not mix languages.`
    : "";

  const multiCitySystemPrompt = `You are a multi-city travel planning agent. Your goal is to plan the complete journey as fast as possible.

CRITICAL RULE — PARALLEL TOOL CALLS:
In your FIRST response, you MUST call ALL tools simultaneously in a single batch. Do NOT call tools one at a time.

For a ${cityCount}-city trip you must call exactly ${legCount + cityCount + 1} tools in parallel in one shot:
- ${legCount} × search_flight_leg (one per flight leg including return)
- ${cityCount} × plan_city_stop (one per city)
- 1 × optimize_total_budget

Fire all ${legCount + cityCount + 1} tool calls in your very first response. Then write the final travel plan after receiving all results.

Do NOT use emojis anywhere in the output. Use plain text headings only.${languageAddition}`;

  const userMessage = isMultiCity
    ? `
Plan a multi-city trip:
- Route: ${cityList.map((c, i) => `${c} (${daysList[i] ?? 3} days)`).join(" → ")}
- Departure: ${startDate || "flexible"}
- Travelers: ${travelers || 2}
- Interests: ${interests || "general"}
- Budget per person (total): €${budget || 3000}

IMPORTANT: Call ALL tools simultaneously in a single batch — not sequentially.
Then create a detailed day-by-day travel plan in ${languageName}.
`.trim()
    : `
Plan a trip with the following preferences:
- Origin (departure city): ${origin || "Germany"}
- Destination: ${destination || "flexible"}
- Dates: ${startDate || "flexible"} to ${endDate || "flexible"}
- Travelers: ${travelers || 2}
- Interests: ${interests || "general"}
- Budget per person: €${budget || 3000}${budgetNote}

Use the available tools to research${flightsIncluded ? " flights from " + (origin || "Germany") + "," : ""} ${hotelIncluded ? "hotels," : ""} and activities and optimise the budget.
Then create a concrete, structured travel plan in ${languageName}.
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

          const adventureAddition = adventureMode ? `

ADVENTURE MODE — override standard behavior:
- Prioritize off-the-beaten-path experiences. Avoid overrun tourist attractions; suggest what locals and explorers do instead.
- Recommend local guesthouses, mountain huts, homestays, or camping over international hotel chains.
- Highlight physical/active experiences: multi-day treks, wild camping, local transport, street food, border crossings.
- Mention authentic local culture, hidden gems, and the unexpected. Be enthusiastic about discovery.
- Tone: exploratory, bold, honest about difficulty.` : "";

          const childrenSummary = childrenList.length > 0
            ? childrenList.map(c => `${c.age < 1 ? "infant (< 1 yr)" : `${c.age} yr old`}${c.gender !== "unspecified" ? ` ${c.gender}` : ""}`).join(", ")
            : null;

          const familyAddition = familyMode ? `

FAMILY MODE — adapt entire plan for families with children:${childrenSummary ? `\n- Traveling with: ${childrenSummary}. Tailor activity energy levels, nap/rest times, and age-appropriate attractions accordingly.` : ""}
- Prioritize kid-friendly activities: theme parks, beaches, gentle nature walks, interactive museums, zoos, water parks.
- Avoid strenuous multi-day treks, extreme sports, late-night venues, or activities unsuitable for children.
- Recommend family rooms, apartments, or resorts with pools, kids clubs, playgrounds, and early dinner options.
- Include family pricing notes: child discounts, free-for-under-12 policies, family passes, family ticket bundles.
- Suggest walkable, safe neighborhoods convenient for strollers and young children.
- Balance adult enjoyment with child-appropriate pacing — include rest time and low-key afternoons.
- Tone: warm, practical, reassuring.` : "";

          const singleCitySystemPrompt = `You are a professional travel planner. Create structured, concrete travel plans in English.

RULES:
- Do NOT use Markdown tables (no | --- | format). Use headings (##), bullet points (-) and bold (**) instead.
- NEVER end with questions, offers to continue, or chatbot-style closings ("Should I...", "Would you like...", "Can I help with..."). The plan is complete and self-contained.
- If both Wellness AND Luxury are listed as interests, look for hotels that offer BOTH: luxury accommodation with wellness/spa facilities.
- Be precise with prices: mark estimates as "approx." and ranges as "€X–€Y".
- For each itinerary day or activity block, add one sentence explaining WHY this was selected (e.g. "→ Why: best value for the dates, close to major sights").
- For any train, bus, or ferry connections: ALWAYS specify the exact departure station/terminal, arrival station/terminal, and approximate travel time (e.g. "ICE from Berlin Hbf → Munich Hbf, ~4h").
- Occupancy outlook: mention if the travel period is peak, shoulder, or low season for the destination and what to expect (crowds, pricing).
- Do NOT use emojis anywhere in the output. Use plain text headings only.${adventureAddition}${familyAddition}${languageAddition}`;

          // Stream every Claude call — text tokens arrive live, tool_use detected after
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: isMultiCity ? 8192 : 4096,
            system: isMultiCity && iterations === 1
              ? [{ type: "text" as const, text: multiCitySystemPrompt, cache_control: { type: "ephemeral" as const } }]
              : [{ type: "text" as const, text: singleCitySystemPrompt, cache_control: { type: "ephemeral" as const } }],
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
                // Forward Amadeus real-data events to the frontend for live price pills
                if (toolUse.name === "search_flights" || toolUse.name === "search_flight_leg") {
                  try {
                    const parsed = JSON.parse(content);
                    if (parsed.source === "amadeus" && parsed.priceRange) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "flights", ...parsed })}\n\n`)
                      );
                    }
                  } catch { /* non-JSON result — ignore */ }
                }
                if (toolUse.name === "search_hotels") {
                  try {
                    const parsed = JSON.parse(content);
                    if (parsed.source === "amadeus" && parsed.priceRange) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "hotels", ...parsed })}\n\n`)
                      );
                    }
                  } catch { /* non-JSON result — ignore */ }
                }
                if (toolUse.name === "get_activities") {
                  try {
                    const parsed = JSON.parse(content);
                    if (parsed.source === "amadeus" && parsed.count) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "activities", ...parsed })}\n\n`)
                      );
                    }
                  } catch { /* non-JSON result — ignore */ }
                }
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
            const rawText = finalMessage.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join(" ");
            // Ensure a space exists at every sentence boundary between adjacent chunks
            const fullText = rawText.replace(/([.!?:])([A-Z][a-z])/g, "$1 $2");
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
                  description: "Generate 8 structured trip card options based on the travel plan already created.",
                  input_schema: {
                    type: "object" as const,
                    properties: {
                      cards: {
                        type: "array",
                        minItems: 5,
                        maxItems: 8,
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            destination: { type: "string" },
                            tagline: { type: "string", description: "Short catchy tagline, max 5 words" },
                            description: { type: "string", description: "2 sentences max" },
                            price: { type: "number", description: "Estimated total price per person in EUR" },
                            duration: { type: "string", description: "e.g. '10 Tage'" },
                            themes: { type: "array", items: { type: "string" }, description: "2-3 theme tags in English" },
                            highlights: { type: "array", items: { type: "string" }, description: "4 highlights in English" },
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
                    content: adventureMode
                      ? `Based on the travel plan above, generate 5 ADVENTURE trip card options for ${destination}. Each must be genuinely adventurous. Tiers: ultra-budget backpacker (hostels/camping), budget active explorer, balanced active trip, premium expedition (guided tours/gear), luxury adventure lodge. All prices realistic. Use English. bookingUrl = Google Flights from ${origin || "Germany"} to destination.`
                      : familyMode
                        ? `Based on the travel plan above, generate 5 FAMILY-FRIENDLY trip card options for ${destination}.${childrenSummary ? ` Traveling with: ${childrenSummary}.` : ""} Tiers: budget self-catering apartment (bunk beds, kitchen), affordable family hotel (pool, kids menu), comfortable family resort (kids club, entertainment), premium family villa (private pool, nanny service), luxury all-inclusive family retreat. Include child discounts and family pricing notes. All prices realistic. Use English. bookingUrl = Google Flights from ${origin || "Germany"} to destination.`
                        : `Based on the travel plan above, generate 8 different trip card options for ${destination}. Vary styles across: ultra-budget backpacker, budget-friendly hostel, balanced mid-range, comfort traveller, premium comfort, business class, luxury boutique, ultra-luxury. Give distinct itinerary themes (beach focus, city focus, nature, cultural, adventure mix, food & wine, romantic, family-style). All prices realistic. Use English. bookingUrl = Google Flights from ${origin || "Germany"} to destination.`,
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
