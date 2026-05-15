import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_flights",
    description: "Sucht nach Flugverbindungen für eine Destination und einen Zeitraum.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Abflughafen oder Stadt" },
        destination: { type: "string", description: "Zielort" },
        departure_date: { type: "string", description: "Abreisedatum (YYYY-MM-DD)" },
        return_date: { type: "string", description: "Rückreisedatum (YYYY-MM-DD)" },
        travelers: { type: "number", description: "Anzahl Reisende" },
      },
      required: ["destination"],
    },
  },
  {
    name: "search_hotels",
    description: "Sucht nach Hotels und Unterkünften am Reiseziel.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Reiseziel" },
        check_in: { type: "string", description: "Check-in Datum" },
        check_out: { type: "string", description: "Check-out Datum" },
        travelers: { type: "number", description: "Anzahl Personen" },
        style: { type: "string", description: "Unterkunftsstil (budget/comfort/luxury)" },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_activities",
    description: "Findet Aktivitäten, Sehenswürdigkeiten und Erlebnisse am Reiseziel.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Reiseziel" },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Interessen (culture, nature, beach, adventure, food, luxury)",
        },
        duration_days: { type: "number", description: "Reisedauer in Tagen" },
      },
      required: ["destination"],
    },
  },
  {
    name: "optimize_budget",
    description: "Optimiert den Reiseplan auf das vorgegebene Budget.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string" },
        budget_per_person: { type: "number", description: "Budget pro Person in Euro" },
        travelers: { type: "number" },
        duration_days: { type: "number" },
      },
      required: ["destination", "budget_per_person"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  switch (name) {
    case "search_flights": {
      const origin = input.origin ? ` from ${input.origin}` : "";
      const date = input.departure_date ? ` ${input.departure_date}` : "";
      const pax = input.travelers ? ` ${input.travelers} passengers` : "";
      const query = `flights to ${input.destination}${origin}${date}${pax} price`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 5 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "search_hotels": {
      const style = input.style ? ` ${input.style}` : "";
      const date = input.check_in ? ` ${input.check_in}` : "";
      const query = `best${style} hotels in ${input.destination}${date} recommendations`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 5 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "get_activities": {
      const interests = Array.isArray(input.interests) && input.interests.length > 0
        ? ` ${(input.interests as string[]).join(", ")}`
        : "";
      const days = input.duration_days ? ` ${input.duration_days} days` : "";
      const query = `top things to do${interests} in ${input.destination}${days} attractions`;
      try {
        const result = await tvly.search(query, { searchDepth: "basic", maxResults: 5 });
        return JSON.stringify({
          destination: input.destination,
          results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        });
      } catch {
        return JSON.stringify({ destination: input.destination, error: "Search unavailable", results: [] });
      }
    }
    case "optimize_budget":
      return JSON.stringify({
        breakdown: {
          flights: Math.floor((input.budget_per_person as number) * 0.35),
          hotel: Math.floor((input.budget_per_person as number) * 0.35),
          activities: Math.floor((input.budget_per_person as number) * 0.15),
          food: Math.floor((input.budget_per_person as number) * 0.10),
          transport: Math.floor((input.budget_per_person as number) * 0.05),
        },
        total: input.budget_per_person,
        savings_tip: "Frühbucherrabatte für Flüge sparen bis zu 25%",
      });
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, travelers, interests, budget } = await req.json();

  const userMessage = `
Plane eine Reise mit folgenden Wünschen:
- Destination: ${destination || "flexibel"}
- Zeitraum: ${startDate || "flexibel"} bis ${endDate || "flexibel"}
- Reisende: ${travelers || 2} Person(en)
- Interessen: ${interests || "allgemein"}
- Budget pro Person: €${budget || 3000}

Nutze die verfügbaren Tools um Flüge, Hotels, Aktivitäten zu analysieren und das Budget zu optimieren.
Erstelle dann einen konkreten, strukturierten Reisevorschlag auf Deutsch.
`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: userMessage },
      ];

      let continueLoop = true;
      let iterations = 0;
      const MAX_ITERATIONS = 10;

      while (continueLoop && iterations < MAX_ITERATIONS) {
        iterations++;
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          tools,
          messages,
        });

        if (response.stop_reason === "tool_use") {
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          for (const toolUse of toolUseBlocks) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_call", tool: toolUse.name })}\n\n`)
            );
          }

          messages.push({ role: "assistant", content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (toolUse) => ({
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: await executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
            }))
          );

          messages.push({ role: "user", content: toolResults });
        } else {
          const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
          if (textBlock) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "result", text: textBlock.text })}\n\n`)
            );
          }
          continueLoop = false;
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
