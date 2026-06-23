import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_culture",
  description: "Search the web for cultural information, customs, and etiquette for a travel destination.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "A focused search query about culture, customs, or etiquette" },
    },
    required: ["query"],
  },
};

async function tavilySearch(query: string): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  try {
    const result = await tvly.search(query, { searchDepth: "basic", maxResults: 4 });
    return JSON.stringify({ results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })) });
  } catch {
    return JSON.stringify({ error: "Search unavailable", results: [] });
  }
}

const SYSTEM_PROMPT = `You are a cultural intelligence researcher helping travellers understand local customs and etiquette.

Work in two phases:
1. Call search_culture 4 times covering: (1) key phrases and greetings in local language, (2) social etiquette and dress code, (3) tipping culture and practices, (4) food and dining customs.
2. After research, stop using tools — you will be asked to call generate_culture_report once.

CRITICAL RULES:
- Be specific and practical — things a traveller needs to know before arrival.
- No invented facts. Only report what your research confirmed.
- Do not use quotation marks in any text fields.
- Keep details concise: 2-3 actionable sentences per item.`;

export async function POST(req: NextRequest) {
  const { destination } = await req.json() as { destination?: string };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const userMessage = `Research cultural customs and practical etiquette for a traveller visiting ${destination || "the destination"}.
Cover: key local phrases, social etiquette, tipping, dining customs, and important do/don't rules.`;

        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
        let continueLoop = true;
        let iterations = 0;

        while (continueLoop && iterations < 5) {
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
                const content = await tavilySearch(String((toolUse.input as Record<string, unknown>).query ?? ""));
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: toolUse.id, tool: toolUse.name })}\n\n`)
                );
                return { type: "tool_result" as const, tool_use_id: toolUse.id, content };
              })
            );
            messages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;

            const cultureTool: Anthropic.Tool = {
              name: "generate_culture_report",
              description: "Generate a structured cultural guide for the destination.",
              input_schema: {
                type: "object" as const,
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", description: "A single relevant emoji" },
                        category: { type: "string", description: "One of: Phrases, Etiquette, Tipping, Dining, Transport, Do & Don't" },
                        title: { type: "string", description: "Short title (3-6 words)" },
                        details: { type: "string", description: "2-3 practical sentences. No quotation marks." },
                      },
                      required: ["icon", "category", "title", "details"],
                    },
                    minItems: 6,
                    maxItems: 12,
                  },
                },
                required: ["items"],
              },
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "culture", tool: "generate_culture_report", input: { destination }, iteration: iterations + 1 })}\n\n`)
            );

            type RawResult = { items?: unknown };
            let result: RawResult | undefined;
            let lastError: string | null = null;
            const baseInstruction =
              "Now call generate_culture_report. items must be a native JSON array. No quotation marks in text fields.";

            for (let attempt = 0; attempt < 3 && !(Array.isArray(result?.items) && (result.items as unknown[]).length > 0); attempt++) {
              const instruction =
                attempt === 0
                  ? baseInstruction
                  : `Previous attempt invalid (${lastError}). items must be a native JSON array. Try again.`;

              const cultureResponse = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                tool_choice: { type: "any" },
                tools: [cultureTool],
                messages: [
                  ...messages,
                  { role: "assistant", content: finalMessage.content },
                  { role: "user", content: instruction },
                ],
              });

              const cultureBlock = cultureResponse.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_culture_report"
              );
              const raw = cultureBlock?.input as RawResult | undefined;

              if (raw) {
                let items = raw.items;
                if (typeof items === "string") {
                  try { items = JSON.parse(items); } catch (e) {
                    lastError = e instanceof Error ? e.message : "invalid JSON";
                    items = undefined;
                  }
                }
                if (Array.isArray(items) && items.length > 0) {
                  result = { items };
                } else {
                  lastError = "items missing or empty";
                }
              } else {
                lastError = "tool block not found";
              }
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "culture", tool: "generate_culture_report" })}\n\n`)
            );

            if (result && Array.isArray(result.items) && result.items.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "culture", items: result.items })}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Could not generate culture report." })}\n\n`)
              );
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
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
