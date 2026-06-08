import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

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
};

function buildSystemPrompt(trip: TripContext): string {
  const themes = trip.themes?.length ? trip.themes.join(", ") : "—";
  const itinerary = trip.itinerary?.length
    ? trip.itinerary.map((d) => `${d.day}: ${d.activities.join(", ")}`).join("\n")
    : "Noch kein detailliertes Tagesprogramm hinterlegt.";

  return `Du bist der persönliche Reise-Concierge des Travelers für seine gespeicherte Reise. Du kennst diese Reise im Detail:

- Ziel: ${trip.destination ?? "unbekannt"}
- Zeitraum: ${trip.startDate || "flexibel"} bis ${trip.endDate || "flexibel"}
- Reisende: ${trip.travelers ?? 2} Person(en)
- Themen: ${themes}
- Geplantes Programm:
${itinerary}

Beantworte Fragen des Travelers zu dieser Reise warmherzig, kompetent und auf Deutsch — wie ein kundiger Freund, nicht wie ein Bericht:
- Schreibe in fließenden, kurzen Absätzen. KEIN Markdown — keine Überschriften, Tabellen, Aufzählungszeichen oder Sternchen.
- Nutze search_live_info NUR, wenn die Frage aktuelle/zeitkritische Infos braucht (Wetter, Events, Öffnungszeiten, Preise, Nachrichten). Sonst antworte direkt aus dem Reisekontext und deinem Wissen — ohne Tool-Aufruf.
- Halte Antworten prägnant: in der Regel 2-5 Sätze, nur bei Detailfragen ausführlicher.
- Beziehe dich, wo passend, konkret auf das geplante Programm der Reise.`;
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
