import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_sim",
  description: "Search for SIM card and connectivity options for a travel destination.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string" },
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

const SYSTEM_PROMPT = `You are a connectivity expert helping travellers stay connected abroad.

Work in two phases:
1. Call search_sim 3 times covering: (1) local SIM cards and costs in destination, (2) eSIM providers for destination (Airalo, Holafly, etc.), (3) mobile coverage and data speeds.
2. After research, call generate_sim_report once with structured results.

Rules: Be specific with prices where found. No quotation marks in text fields. 2-3 sentences per item.`;

export async function POST(req: NextRequest) {
  const { destination } = await req.json() as { destination?: string };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [{
          role: "user",
          content: `Find the best SIM card and connectivity options for a traveller visiting ${destination || "the destination"}.`,
        }];
        let continueLoop = true;
        let iterations = 0;

        while (continueLoop && iterations < 4) {
          iterations++;
          const apiStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: [searchTool],
            messages,
          });
          const finalMessage = await apiStream.finalMessage();

          if (finalMessage.stop_reason === "tool_use") {
            const toolUseBlocks = finalMessage.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
            messages.push({ role: "assistant", content: finalMessage.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (tu) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: tu.id, tool: tu.name, input: tu.input, iteration: iterations })}\n\n`));
                const content = await tavilySearch(String((tu.input as Record<string, unknown>).query ?? ""));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: tu.id, tool: tu.name })}\n\n`));
                return { type: "tool_result" as const, tool_use_id: tu.id, content };
              })
            );
            messages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;

            const reportTool: Anthropic.Tool = {
              name: "generate_sim_report",
              description: "Generate structured SIM/connectivity guide.",
              input_schema: {
                type: "object" as const,
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string" },
                        category: { type: "string", description: "One of: Local SIM, eSIM, Coverage, Data Speed, Tips" },
                        title: { type: "string" },
                        details: { type: "string" },
                      },
                      required: ["icon", "category", "title", "details"],
                    },
                    minItems: 4,
                    maxItems: 8,
                  },
                },
                required: ["items"],
              },
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "sim", tool: "generate_sim_report", input: { destination }, iteration: iterations + 1 })}\n\n`));

            type RawResult = { items?: unknown };
            let result: RawResult | undefined;

            for (let attempt = 0; attempt < 3 && !(Array.isArray(result?.items) && (result.items as unknown[]).length > 0); attempt++) {
              const r = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                tool_choice: { type: "any" },
                tools: [reportTool],
                messages: [...messages, { role: "assistant", content: finalMessage.content }, { role: "user", content: attempt === 0 ? "Now call generate_sim_report. items must be a native JSON array. No quotation marks." : "Try again — items must be a native JSON array." }],
              });
              const block = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
              const raw = block?.input as RawResult | undefined;
              if (raw) {
                let items = raw.items;
                if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = undefined; } }
                if (Array.isArray(items) && items.length > 0) result = { items };
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "sim", tool: "generate_sim_report" })}\n\n`));

            if (result && Array.isArray(result.items) && result.items.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "sim", items: result.items })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Could not generate SIM report." })}\n\n`));
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })}\n\n`));
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
