import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_current_flights",
    description: "Search for current flight prices on a specific route and dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Departure city or airport" },
        destination: { type: "string", description: "Arrival city or airport" },
        departure_date: { type: "string", description: "Outbound date (YYYY-MM-DD)" },
        return_date: { type: "string", description: "Return date (YYYY-MM-DD), if round trip" },
        travelers: { type: "number", description: "Number of passengers" },
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
        check_in: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
        check_out: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
        style: { type: "string", description: "Hotel style/category, e.g. budget, comfort, luxury" },
      },
      required: ["destination"],
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

const SYSTEM_PROMPT = `You are a price-monitoring specialist watching a trip the traveler already saved. Your job: find out whether flights and hotels for this trip have gotten cheaper, pricier, or stayed about the same since they saved it — and give a short, clear verdict.

IMMEDIATELY call BOTH tools in parallel in your first response:
1. search_current_flights — current flight prices for the saved route and dates
2. search_current_hotels — current hotel prices for the destination and dates

Then compare what you find to the traveler's ORIGINAL baseline price (given in the message) and write a short verdict in German — like a push notification, NOT a report:
- Plain flowing prose only. NO Markdown — no headers, no tables, no bullet points, no bold/italic asterisks.
- Exactly 2-3 short sentences, max ~50 words total.
- Sentence 1: the trend — günstiger geworden / teurer geworden / etwa gleich geblieben — with a rough current price if you can estimate one.
- Sentence 2 (optional): one concrete number or detail backing that up.
- Final sentence: one practical recommendation (e.g. "Jetzt buchen lohnt sich." / "Noch ein paar Wochen abwarten." / "Preise im Auge behalten.").

If no baseline price was provided, skip the comparison and just give a one-sentence summary of the current price range plus a recommendation — same length limit, same plain-prose style.`;

export async function POST(req: NextRequest) {
  const { destination, origin, startDate, endDate, travelers, style, baselineFlights, baselineHotel } = await req.json();

  const baseline =
    baselineFlights || baselineHotel
      ? `Ausgangspreise beim Speichern: Flüge ca. €${baselineFlights ?? "?"} p.P., Hotel ca. €${baselineHotel ?? "?"} p.P.`
      : "Kein Ausgangspreis gespeichert (nur Beispieldaten verfügbar) — gib stattdessen die aktuelle Preisspanne an.";

  const userMessage = `
Bitte prüfe die aktuellen Preise für diese gespeicherte Reise:
- Strecke: ${origin || "Deutschland"} → ${destination}
- Zeitraum: ${startDate || "flexibel"} bis ${endDate || "flexibel"}
- Reisende: ${travelers || 2} Person(en)
- Hotelstil: ${style || "comfort"}
- ${baseline}

Suche aktuelle Flug- und Hotelpreise und vergleiche sie mit dem Ausgangspreis. Gib mir eine kurze Einschätzung auf Deutsch.
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
            max_tokens: 1536,
            system: SYSTEM_PROMPT,
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
