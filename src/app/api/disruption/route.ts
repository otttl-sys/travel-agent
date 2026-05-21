import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "check_flight_status",
    description: "Check the current status of a specific flight — on time, delayed, cancelled, or diverted.",
    input_schema: {
      type: "object" as const,
      properties: {
        flight_number: { type: "string", description: "IATA flight number, e.g. LH401, BA112, AF007" },
        date: { type: "string", description: "Flight date (YYYY-MM-DD or 'today')" },
      },
      required: ["flight_number"],
    },
  },
  {
    name: "find_alternative_flights",
    description: "Search for alternative flights on the same route when the original flight is disrupted.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Departure airport (IATA code or city)" },
        destination: { type: "string", description: "Arrival airport (IATA code or city)" },
        date: { type: "string", description: "Travel date" },
        travelers: { type: "number", description: "Number of passengers" },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "check_passenger_rights",
    description: "Look up EU261/2004 passenger rights, compensation eligibility, and airline obligations for flight disruptions.",
    input_schema: {
      type: "object" as const,
      properties: {
        disruption_type: { type: "string", description: "Type: delay, cancellation, denied_boarding, or diversion" },
        delay_hours: { type: "number", description: "Delay duration in hours (if applicable)" },
        route_type: { type: "string", description: "intra_eu, eu_departure, or eu_arrival" },
        flight_distance_km: { type: "number", description: "Flight distance in km (affects compensation tier)" },
      },
      required: ["disruption_type"],
    },
  },
  {
    name: "find_airport_lounge",
    description: "Find available airport lounges at the departure or layover airport during a delay.",
    input_schema: {
      type: "object" as const,
      properties: {
        airport: { type: "string", description: "Airport name or IATA code, e.g. FRA, MUC, LHR" },
        terminal: { type: "string", description: "Terminal (optional)" },
      },
      required: ["airport"],
    },
  },
  {
    name: "find_airport_hotel",
    description: "Find hotels near the airport for overnight delays or missed connections.",
    input_schema: {
      type: "object" as const,
      properties: {
        airport: { type: "string", description: "Airport name or IATA code" },
        night: { type: "string", description: "Night of stay (date or 'tonight')" },
      },
      required: ["airport"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const search = async (query: string) => {
    try {
      const result = await tvly.search(query, { searchDepth: "basic", maxResults: 3 });
      return JSON.stringify({ results: result.results.map((r) => ({ title: r.title, url: r.url, content: r.content })) });
    } catch {
      return JSON.stringify({ error: "Search unavailable", results: [] });
    }
  };

  switch (name) {
    case "check_flight_status": {
      const date = input.date ? ` ${input.date}` : " today";
      return search(`flight ${input.flight_number}${date} status delay cancelled live tracker`);
    }
    case "find_alternative_flights": {
      const date = input.date ? ` ${input.date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      return search(`alternative flights ${input.origin} to ${input.destination}${date}${pax} available today`);
    }
    case "check_passenger_rights": {
      const type = input.disruption_type as string;
      const hours = input.delay_hours ? ` ${input.delay_hours} hour delay` : "";
      const dist = input.flight_distance_km ? ` ${input.flight_distance_km}km` : "";
      return search(`EU261 passenger rights ${type}${hours}${dist} compensation 2024 eligibility`);
    }
    case "find_airport_lounge": {
      const terminal = input.terminal ? ` terminal ${input.terminal}` : "";
      return search(`airport lounge ${input.airport}${terminal} access options priority pass 2024`);
    }
    case "find_airport_hotel": {
      const night = input.night ? ` ${input.night}` : "";
      return search(`hotel near ${input.airport} airport${night} shuttle overnight stay`);
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const SYSTEM_PROMPT = `You are a flight disruption management specialist. Your job is to help stranded passengers as efficiently as possible.

When a user reports a disrupted flight, IMMEDIATELY call ALL relevant tools in parallel in your first response:
1. check_flight_status — confirm the disruption
2. find_alternative_flights — find rebooking options
3. check_passenger_rights — determine compensation eligibility
4. find_airport_lounge — if delay > 2h
5. find_airport_hotel — if overnight delay or long disruption

Call all applicable tools simultaneously. Then write a clear, actionable disruption report in German:
- Current flight status
- Best alternative flight options (ranked)
- Passenger rights & compensation they're entitled to
- Practical next steps (lounge, hotel, rebooking contact)

Be direct and helpful. The passenger is stressed. Prioritise actionable advice.`;

export async function POST(req: NextRequest) {
  const { flightNumber, date, origin, destination, travelers, disruptionType } = await req.json();

  const userMessage = `
Mein Flug ist gestört:
- Flugnummer: ${flightNumber}
- Datum: ${date || "heute"}
- Strecke: ${origin || "unbekannt"} → ${destination || "unbekannt"}
- Reisende: ${travelers || 1}
- Problem: ${disruptionType || "Verspätung / unklar"}

Bitte prüfe den Flugstatus, finde Alternativen und informiere mich über meine Rechte.
`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 6;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          const apiStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools,
            messages,
          });

          apiStream.on("text", (text) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`));
          });

          apiStream.on("streamEvent", (event) => {
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", tool: event.content_block.name })}\n\n`));
            }
          });

          const finalMessage = await apiStream.finalMessage();

          if (finalMessage.stop_reason === "tool_use") {
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            messages.push({ role: "assistant", content: finalMessage.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (toolUse) => ({
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: await executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
              }))
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
