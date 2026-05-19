import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "get_visa_requirements",
    description: "Retrieves visa and entry requirements for a destination country based on passport nationality.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Destination country or city" },
        passport_country: { type: "string", description: "Passport / nationality of the traveler (e.g. Germany, Austria)" },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_climate_info",
    description: "Retrieves climate, weather, and best travel season information for a destination.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Destination country or city" },
        month: { type: "string", description: "Month or season of travel (optional)" },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_safety_info",
    description: "Retrieves travel safety advisories, health requirements, and practical security tips for a destination.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Destination country or city" },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_local_tips",
    description: "Retrieves insider local tips, cultural norms, currency info, transport, and practical travel advice.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Destination country or city" },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Focus areas like food, culture, nightlife, nature, shopping",
        },
      },
      required: ["destination"],
    },
  },
  {
    name: "get_best_time_to_visit",
    description: "Determines the best time to visit a destination, including high/low season, festivals, and events.",
    input_schema: {
      type: "object" as const,
      properties: {
        destination: { type: "string", description: "Destination country or city" },
      },
      required: ["destination"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });

  const search = async (query: string) => {
    try {
      const result = await tvly.search(query, { searchDepth: "basic", maxResults: 5 });
      return JSON.stringify({
        query,
        results: result.results.map((r) => ({ title: r.title, url: r.url, content: r.content })),
      });
    } catch {
      return JSON.stringify({ query, error: "Search unavailable", results: [] });
    }
  };

  switch (name) {
    case "get_visa_requirements": {
      const passport = input.passport_country ? ` for ${input.passport_country} passport holders` : "";
      return search(`visa requirements ${input.destination}${passport} entry requirements 2024 2025`);
    }
    case "get_climate_info": {
      const month = input.month ? ` in ${input.month}` : "";
      return search(`${input.destination} climate weather${month} temperature rainfall what to expect`);
    }
    case "get_safety_info": {
      return search(`${input.destination} travel safety advisory 2024 2025 health requirements vaccinations tips`);
    }
    case "get_local_tips": {
      const interests = Array.isArray(input.interests) && input.interests.length > 0
        ? ` ${(input.interests as string[]).join(", ")}`
        : "";
      return search(`${input.destination} local tips${interests} culture etiquette currency transport insider advice`);
    }
    case "get_best_time_to_visit": {
      return search(`best time to visit ${input.destination} high season low season festivals events avoid`);
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export async function POST(req: NextRequest) {
  const { destination, passportCountry, interests } = await req.json();

  const userMessage = `
Research the following destination thoroughly and create a comprehensive travel research report:

Destination: ${destination}
Passport / Nationality: ${passportCountry || "not specified"}
Interests / Focus: ${interests?.length > 0 ? interests.join(", ") : "general"}

Use ALL available research tools to gather current, accurate information. Then write a well-structured research report in German covering:
1. Visa & Entry Requirements
2. Climate & Best Time to Visit
3. Safety & Health
4. Local Tips & Culture (currency, transport, etiquette, food)

Be specific and practical. Cite sources where possible. Format with clear headings.
`.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            system: "You are a professional travel research specialist. Use all available tools to gather comprehensive, up-to-date information about destinations. Synthesize findings into practical, actionable research reports. Always use tools before writing the final report.",
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
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
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
