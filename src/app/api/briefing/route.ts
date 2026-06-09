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

const SYSTEM_PROMPT = `Du bist ein Briefing-Spezialist, der aus den vorhandenen Erkenntnissen anderer Reise-Agenten (Preis-Trend, Tagesplan) und frischer Recherche EIN zusammenhängendes Vorab-Briefing für eine gespeicherte Reise erstellt — "alles, was man vor der Abreise wissen muss", warm geschrieben wie von einem erfahrenen Reisebegleiter, nicht wie eine trockene Checkliste.

Arbeite in zwei Schritten:
1. Rufe search_travel_essentials 1-2 Mal auf, um Lücken zu schließen, die NICHT bereits durch die mitgelieferten Preis-Trend- oder Tagesplan-Daten abgedeckt sind — z. B. aktuelles Wetter/Saison, praktische Last-Minute-Hinweise (Visum, Währung, Verkehr, Gesundheit). WICHTIG: Falls kein Preis-Trend oder kein Tagesplan mitgeliefert wurde, recherchiere stattdessen selbst eine passende Ersatz-Information (z. B. aktuelle Preisrichtwerte oder eine sinnvolle Tagesstruktur) — schreibe NIEMALS, dass Daten "nicht verfügbar" seien. Das fertige Briefing soll sich immer vollständig und selbstbewusst anfühlen.
2. Rufe danach GENAU EINMAL generate_briefing auf — mit 3-5 Abschnitten, die alles zu einem runden Ganzen verweben (nicht als separate Datenblöcke nebeneinanderstellen).

Für jeden Abschnitt:
- icon: ein passendes Emoji
- title: ein kurzer, einladender Titel auf Deutsch (z. B. "Preise im Blick", "Dein Tagesrhythmus", "Wetter & Packliste", "Vor Ort wichtig")
- body: 2-4 Sätze Fließtext auf Deutsch, OHNE Markdown, OHNE Aufzählungszeichen — warm, konkret, persönlich formuliert ("Du wirst...", "Plane ein, dass...")

Typische Themen (wähle die passendsten 3-5, je nach verfügbaren Daten): Preisentwicklung & Buchungstiming, Tagesablauf-Überblick, Wetter & was einzupacken ist, praktische Vor-Ort-Hinweise, kulturelle/saisonale Besonderheiten.`;

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
    ? `Preis-Trend: ${priceWatch.trend} — ${priceWatch.summary}`
    : "Kein Preis-Trend gespeichert (noch kein Price Watcher gelaufen) — bitte recherchiere selbst eine passende aktuelle Preiseinschätzung für dieses Ziel.";
  const dayPlanStr = dayPlanSummary?.length
    ? dayPlanSummary.join("; ")
    : "Kein Tagesplan gespeichert (noch kein Day Planner gelaufen) — bitte recherchiere selbst eine sinnvolle grobe Tagesstruktur für dieses Ziel.";

  const userMessage = `
Erstelle ein Vorab-Briefing für diese Reise:
- Ziel: ${destination ?? "unbekannt"}
- Reisezeitraum: ${startDate ?? "?"} – ${endDate ?? "?"}
- Reisende: ${travelers ?? "?"}
- Themen: ${themeStr}
- ${priceStr}
- Tagesplan-Überblick: ${dayPlanStr}

Recherchiere zuerst kurz die fehlenden Bausteine (Wetter, praktische Hinweise, ggf. Ersatz-Recherche für fehlende Daten), dann erstelle das vollständige Briefing mit generate_briefing — 3-5 zusammenhängende Abschnitte.
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
                    content: "Erstelle jetzt das vollständige Briefing mit generate_briefing — 3-5 zusammenhängende Abschnitte, auf Deutsch.",
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
