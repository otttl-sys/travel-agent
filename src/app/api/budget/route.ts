import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic();

const searchTool: Anthropic.Tool = {
  name: "search_travel_costs",
  description: "Search the web for current travel costs at a destination — flights, hotels, food prices, activity costs, or local transport.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "A focused search query about travel costs or prices" },
    },
    required: ["query"],
  },
};

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  if (name === "search_travel_costs") {
    try {
      const result = await tvly.search(String(input.query ?? ""), { searchDepth: "basic", maxResults: 4 });
      return JSON.stringify({ results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })) });
    } catch {
      return JSON.stringify({ error: "Search unavailable", results: [] });
    }
  }
  return JSON.stringify({ error: "Unknown tool" });
}

const SYSTEM_PROMPT = `You are a travel budget researcher. Your job: find realistic, current cost estimates for a trip and give an honest verdict on whether the traveler's budget is sufficient.

Work in two phases:
1. Call search_travel_costs 3-5 times to research each relevant cost category (skip any category the traveler has told you they don't need):
   - Flights (return, economy, from the traveler's likely origin region — use Europe if unspecified)
   - Hotel (mid-range, per night)
   - Food & drink (daily budget per person — either sit-down/street food, or grocery/supermarket self-catering costs if the traveler is self-catering)
   - Activities & entrance fees (typical highlights for the destination)
   - Local transport (getting around — metro, taxis, day trips)

   Search specifically, e.g. "flight price Europe to Tokyo 2025", "mid-range hotel cost per night Bangkok", "daily food budget Rome Italy traveler", or "grocery supermarket prices Rome Italy" for self-catering.

2. Call generate_budget_estimate once with the full structured breakdown.

RULES:
- Use real numbers from your research, not vague ranges. If you find a range, use the midpoint.
- All amounts in EUR.
- Per-person figures should reflect solo travel costs; total = per-person × number of travelers (note: hotels are shared so hotel total ≠ hotel per-person × travelers for groups).
- If flights or hotel are excluded, do not research or include a line for them at all.
- If self-catering, the Food line must reflect grocery/cooking costs, not restaurant prices — note this explicitly.
- Be honest: if the budget is insufficient, say so clearly.
- Do not use quotation marks in text fields.`;

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers, budget, includeFlights, includeHotel, selfCatering } = await req.json() as {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    budget?: number;
    includeFlights?: boolean;
    includeHotel?: boolean;
    selfCatering?: boolean;
  };

  const nights = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 7;

  const flightsIncluded = includeFlights !== false;
  const hotelIncluded = includeHotel !== false;

  const userMessage = `Estimate the realistic budget for this trip:
- Destination: ${destination ?? "unknown"}
- Dates: ${startDate ?? "?"} to ${endDate ?? "?"} (${nights} nights)
- Travelers: ${travelers ?? 1}
- Traveler's budget: €${budget ?? 0} per person
- Flights: ${flightsIncluded ? "include in the budget" : "traveler already has flights sorted — do NOT include a Flights line"}
- Hotel: ${hotelIncluded ? "include in the budget" : "traveler already has accommodation sorted (e.g. staying with friends/family) — do NOT include a Hotel line"}
- Food: ${selfCatering ? "traveler will self-cater (cooking, grocery shopping) — base the Food line on supermarket/grocery costs, not restaurants" : "standard mix of restaurants and street food"}

Research current costs for the categories above (skip Flights/Hotel if excluded). Then call generate_budget_estimate with a full breakdown covering only the relevant categories.`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
        let continueLoop = true;
        let iterations = 0;

        while (continueLoop && iterations < 6) {
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

            // Phase 2 — forced structured output
            const budgetTool: Anthropic.Tool = {
              name: "generate_budget_estimate",
              description: "Generate the final structured budget breakdown for the trip.",
              input_schema: {
                type: "object" as const,
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "Flights, Hotel, Food, Activities, Transport, or Other" },
                        icon: { type: "string", description: "A fitting emoji" },
                        amountPerPerson: { type: "number", description: "Estimated cost in EUR per person for the full trip" },
                        amountTotal: { type: "number", description: "Total cost in EUR for all travelers combined" },
                        notes: { type: "string", description: "1-2 sentences explaining the estimate — no quotation marks" },
                      },
                      required: ["category", "icon", "amountPerPerson", "amountTotal", "notes"],
                    },
                  },
                  totalPerPerson: { type: "number", description: "Sum of all amountPerPerson values" },
                  totalAll: { type: "number", description: "Sum of all amountTotal values" },
                  verdict: { type: "string", enum: ["comfortable", "tight", "over-budget"] },
                  verdictNote: { type: "string", description: "1-2 sentences comparing the estimate to the traveler's budget — honest and specific, no quotation marks" },
                },
                required: ["lines", "totalPerPerson", "totalAll", "verdict", "verdictNote"],
              },
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "budget", tool: "generate_budget_estimate", input: { destination }, iteration: iterations + 1 })}\n\n`)
            );

            type RawResult = { lines?: unknown; totalPerPerson?: unknown; totalAll?: unknown; verdict?: unknown; verdictNote?: unknown };
            let result: RawResult | undefined;
            let lastError: string | null = null;
            const baseInstruction =
              "Now call generate_budget_estimate with the full breakdown. lines must be a native JSON array of objects, not a string. All amounts in EUR. No quotation marks in text fields.";

            for (let attempt = 0; attempt < 3 && !isValidResult(result); attempt++) {
              const instruction =
                attempt === 0
                  ? baseInstruction
                  : `Previous attempt invalid (${lastError}). lines must be a native JSON array. Try again.`;

              const budgetResponse = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                tool_choice: { type: "any" },
                tools: [budgetTool],
                messages: [
                  ...messages,
                  { role: "assistant", content: finalMessage.content },
                  { role: "user", content: instruction },
                ],
              });

              const block = budgetResponse.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_budget_estimate"
              );
              const raw = block?.input as RawResult | undefined;

              if (raw) {
                let lines = raw.lines;
                if (typeof lines === "string") {
                  try { lines = JSON.parse(lines); } catch (e) {
                    lastError = e instanceof Error ? e.message : "invalid JSON";
                    lines = undefined;
                  }
                }
                if (Array.isArray(lines) && lines.length > 0) {
                  result = { ...raw, lines };
                } else {
                  lastError = "lines missing or empty";
                }
              } else {
                lastError = "tool block not found";
              }
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "budget", tool: "generate_budget_estimate" })}\n\n`)
            );

            if (isValidResult(result)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "budget", ...result })}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Could not generate budget estimate." })}\n\n`)
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

function isValidResult(r: unknown): r is { lines: unknown[]; totalPerPerson: number; totalAll: number; verdict: string; verdictNote: string } {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return Array.isArray(obj.lines) && obj.lines.length > 0 && typeof obj.verdict === "string";
}
