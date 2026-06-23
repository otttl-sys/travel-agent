import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_insurance",
  description: "Search for travel insurance options and recommendations for a destination.",
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

const SYSTEM_PROMPT = `You are a travel insurance expert helping travellers find the right coverage.

Work in two phases:
1. Call search_insurance 3 times covering: (1) recommended insurance types for this destination, (2) medical evacuation and health coverage needs, (3) cancellation and adventure/activity coverage requirements.
2. After research, call generate_insurance_report once.

Rules: Be specific and practical. Mention approx price ranges where known. No quotation marks. No invented products.`;

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers } = await req.json() as {
    destination?: string; startDate?: string; endDate?: string; travelers?: number;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const userMsg = `Recommend travel insurance for: destination ${destination || "unknown"}, ${travelers ?? 1} traveller(s), ${startDate || "?"} to ${endDate || "?"}.`;
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMsg }];
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
              name: "generate_insurance_report",
              description: "Generate structured travel insurance recommendations.",
              input_schema: {
                type: "object" as const,
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string" },
                        category: { type: "string", description: "One of: Medical, Cancellation, Baggage, Adventure, Emergency, Tips" },
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

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "insurance", tool: "generate_insurance_report", input: { destination }, iteration: iterations + 1 })}\n\n`));

            type RawResult = { items?: unknown };
            let result: RawResult | undefined;

            for (let attempt = 0; attempt < 3 && !(Array.isArray(result?.items) && (result.items as unknown[]).length > 0); attempt++) {
              const r = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                tool_choice: { type: "any" },
                tools: [reportTool],
                messages: [...messages, { role: "assistant", content: finalMessage.content }, { role: "user", content: attempt === 0 ? "Now call generate_insurance_report. items must be a native JSON array. No quotation marks." : "Try again — items must be a native JSON array." }],
              });
              const block = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
              const raw = block?.input as RawResult | undefined;
              if (raw) {
                let items = raw.items;
                if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = undefined; } }
                if (Array.isArray(items) && items.length > 0) result = { items };
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "insurance", tool: "generate_insurance_report" })}\n\n`));

            if (result && Array.isArray(result.items) && result.items.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "insurance", items: result.items })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Could not generate insurance report." })}\n\n`));
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
