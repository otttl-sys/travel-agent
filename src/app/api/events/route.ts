import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/google-maps";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_local_events",
  description: "Search the web for festivals, exhibitions, concerts, markets, or seasonal traditions happening at a destination during a given date range.",
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
    case "search_local_events":
      return search(String(input.query ?? ""));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const SYSTEM_PROMPT = `Du bist ein Vor-Ort-Programm-Rechercheur. Deine Aufgabe: herausfinden, was am Reiseziel GENAU IM REISEZEITRAUM tatsächlich los ist — Festivals, Ausstellungen, Konzerte, Märkte, saisonale Traditionen.

Arbeite in zwei Schritten:
1. Rufe search_local_events 2-3 Mal auf, um konkrete, datumsgebundene Veranstaltungen am Ziel im angegebenen Zeitraum zu finden (z. B. "Veranstaltungen [Ziel] [Monat/Jahr]", "Festivals [Ziel] [Zeitraum]", "Ausstellungen Konzerte [Ziel] [Datum]").
2. Rufe danach GENAU EINMAL generate_events_list auf — mit 3-6 Einträgen.

KRITISCHE REGEL — niemals verletzen: Erfinde NIEMALS einen konkreten Veranstaltungsnamen, ein Datum oder einen Veranstaltungsort, der nicht durch deine Recherche-Ergebnisse belegt ist. Das ist der häufigste Fehler bei Event-Empfehlungen und zerstört das Vertrauen der Reisenden.
- Wenn deine Recherche etwas Konkretes und Datumsgebundenes findet: gib es als reguläres Ereignis wieder, mit dem recherchierten Namen und Datum.
- Wenn deine Recherche NICHTS Konkretes für den genauen Zeitraum liefert: beschreibe stattdessen echte, wiederkehrende saisonale Gepflogenheiten und Traditionen, die zu dieser Jahreszeit am Ziel typisch sind — und formuliere das EHRLICH als Saisonales, z. B. "In dieser Jahreszeit ist am Ziel häufig …" oder "Zu dieser Zeit findet üblicherweise …" — niemals als bestätigte, gebuchte Veranstaltung mit erfundenem Datum.

Für jeden Eintrag:
- icon: ein passendes Emoji
- name: Name der Veranstaltung ODER eine ehrliche Bezeichnung des saisonalen Brauchs (z. B. "Herbstmarkt-Saison in der Altstadt")
- dates: konkretes recherchiertes Datum, ODER bei saisonalen Einträgen eine Zeitraum-Formulierung wie "üblicherweise im Oktober" / "während deines gesamten Aufenthalts"
- category: Festival / Ausstellung / Konzert / Markt / Saisonal / Sport / Tradition
- description: 2-3 sentences of flowing prose in English, NO Markdown — what it is, why it's worth attending, practical tip if relevant

WICHTIG für saubere Daten: Verwende in name, dates, category und description KEINE Anführungszeichen (weder „ " noch ' " oder "") — auch nicht für Eigennamen, Mottos oder Zitate. Schreibe Titel und Mottos ohne umschließende Anführungszeichen oder paraphrasiere sie (z. B. "unter dem Motto All Rise" statt 'unter dem Motto „All Rise"').`;

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, themes } = await req.json() as {
    destination?: string;
    startDate?: string;
    endDate?: string;
    themes?: string[];
  };

  const themeStr = themes?.length ? themes.join(", ") : "—";

  const userMessage = `
Finde heraus, was während dieser Reise am Ziel los ist:
- Ziel: ${destination ?? "unbekannt"}
- Reisezeitraum: ${startDate ?? "?"} – ${endDate ?? "?"}
- Themen/Interessen: ${themeStr}

Recherchiere zuerst gezielt nach datumsgebundenen Veranstaltungen in genau diesem Zeitraum, dann erstelle die finale Liste mit generate_events_list — 3-6 Einträge, ehrlich zwischen recherchierten Veranstaltungen und saisonalen Gepflogenheiten unterschieden.
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

            // Phase 2 — forced structured output: build the final events list
            try {
              const eventsTool: Anthropic.Tool = {
                name: "generate_events_list",
                description: "Generate the final structured list of local events / seasonal happenings for the trip.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          icon: { type: "string", description: "A fitting emoji" },
                          name: { type: "string" },
                          dates: { type: "string" },
                          category: { type: "string" },
                          description: { type: "string", description: "2-3 sentences of flowing prose, no markdown" },
                          venue: { type: "string", description: "Concrete venue/location name (e.g. 'Plaza Mayor', 'Olympiastadion') if your research found one — omit for purely seasonal entries without a specific location" },
                        },
                        required: ["icon", "name", "dates", "category", "description"],
                      },
                    },
                  },
                  required: ["events"],
                },
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "events", tool: "generate_events_list", input: { destination }, iteration: iterations + 1 })}\n\n`)
              );

              let result: unknown;
              let lastError: string | null = null;
              const baseInstruction = "Now create the final list with generate_events_list — 3-6 entries in English, honestly marked as researched vs. seasonal. 'events' must be a native JSON array of objects (not a string). Do not use quotation marks in any text fields.";

              for (let attempt = 0; attempt < 3 && !(Array.isArray(result) && result.length > 0); attempt++) {
                const instruction =
                  attempt === 0
                    ? baseInstruction
                    : `Der vorherige Versuch war ungültig (${lastError}). 'events' muss ein natives JSON-Array von Objekten sein — kein String, kein zusätzliches Escaping, und keine Anführungszeichen in den Texten. Erstelle die Liste jetzt erneut, korrekt strukturiert.`;

                const eventsResponse = await client.messages.create({
                  model: "claude-sonnet-4-6",
                  max_tokens: 8192,
                  tool_choice: { type: "any" },
                  tools: [eventsTool],
                  messages: [
                    ...messages,
                    { role: "assistant", content: finalMessage.content },
                    { role: "user", content: instruction },
                  ],
                });

                const eventsBlock = eventsResponse.content.find(
                  (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_events_list"
                );
                result = eventsBlock ? (eventsBlock.input as { events?: unknown }).events : undefined;
                if (typeof result === "string") {
                  try {
                    result = JSON.parse(result);
                  } catch (e) {
                    lastError = e instanceof Error ? e.message : "ungültiges JSON";
                    result = undefined;
                  }
                } else if (!Array.isArray(result) || result.length === 0) {
                  lastError = "'events' fehlt oder ist leer";
                }
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "events", tool: "generate_events_list" })}\n\n`)
              );

              if (Array.isArray(result) && result.length > 0) {
                const events = result as { venue?: string; lat?: number; lng?: number }[];
                await Promise.all(events.map(async (e) => {
                  if (!e.venue) return;
                  try {
                    const { latlng } = await geocode(`${e.venue}, ${destination}`);
                    e.lat = latlng.lat;
                    e.lng = latlng.lng;
                  } catch { /* non-fatal — skip marker for this event */ }
                }));
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "events", events })}\n\n`)
                );
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Events konnten nicht ermittelt werden." })}\n\n`)
                );
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : "Events konnten nicht ermittelt werden.";
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
