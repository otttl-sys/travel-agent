import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

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

const SYSTEM_PROMPT = `Du bist ein gewissenhafter Tagesplanungs-Spezialist. Deine Aufgabe: aus den groben, thematischen Tagesblöcken einer gespeicherten Reise einen realistischen Stunden-für-Stunde-Tagesplan machen.

Arbeite in zwei Schritten:
1. PFLICHT: Rufe ZUERST search_logistics mindestens 2 Mal auf (z. B. Öffnungszeiten der wichtigsten Sehenswürdigkeiten, typische Besuchsdauer, Wegelogistik/Restaurants am Ziel) — bevor du irgendetwas anderes tust. Deine Zeitangaben müssen auf diesen Recherche-Ergebnissen basieren, nicht auf Vermutungen. Überspringe diesen Schritt NIE.
2. Rufe danach GENAU EINMAL generate_day_schedule auf — mit einem Eintrag pro vorhandenem Tagesblock (falls keine vorhanden sind, erstelle selbst eine sinnvolle 3-5-tägige Struktur passend zu Ziel und Themen), jeweils sinnvoll in eine Morgen-bis-Abend-Abfolge aufgeteilt (Anreise/Frühstück, Hauptaktivitäten, Mittagspause, weitere Programmpunkte, Abendessen etc.).

Für jeden Programmpunkt:
- time: ungefähre Uhrzeit (z. B. "ca. 09:00") — als Vorschlag formuliert, nicht als Garantie
- activity: die Aktivität kurz und konkret
- note: optional ein kurzer praktischer Hinweis (Dauer, Wegzeit zum nächsten Punkt, Tipp) — knapp, auf Deutsch

Bleibe realistisch: plane Pausen ein, unterschätze keine Wegzeiten, und überlade keinen Tag.`;

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

  const userMessage = `
Erstelle einen Stunden-für-Stunde-Tagesplan für diese Reise:
- Ziel: ${destination ?? "unbekannt"}
- Themen: ${themeStr}
- Vorhandene Tagesblöcke:
${dayBlocksStr}

Recherchiere zuerst kurz die Logistik (Öffnungszeiten, Besuchsdauer, Wege), dann erstelle den vollständigen Tagesplan mit generate_day_schedule — ein Eintrag pro Tagesblock.
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
                    content: "Erstelle jetzt den vollständigen Stunden-für-Stunde-Tagesplan mit generate_day_schedule — ein Eintrag pro vorhandenem Tagesblock, auf Deutsch.",
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
