import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { aiResult, startDate } = await req.json() as { aiResult?: string; startDate?: string };

  if (!aiResult) {
    return NextResponse.json({ error: "No plan to parse" }, { status: 400 });
  }

  const extractTool: Anthropic.Tool = {
    name: "extract_timeline",
    description: "Extract a day-by-day timeline from a travel plan.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string", description: "Day label, e.g. Day 1 – Arrival or Day 1 (12 Jul)" },
              blocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: { type: "string", description: "Time of day, e.g. Morning, 09:00, Afternoon" },
                    activity: { type: "string", description: "Short activity title" },
                    note: { type: "string", description: "1-sentence detail. No quotation marks." },
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

  const baseDate = startDate ? new Date(startDate) : null;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tool_choice: { type: "any" },
    tools: [extractTool],
    messages: [{
      role: "user",
      content: `Extract a structured day-by-day timeline from this travel plan. Each day should have 3-5 time blocks (Morning / Afternoon / Evening or specific times). Keep activity titles short (3-6 words). Add a brief note for context.${baseDate ? ` Trip starts ${startDate}.` : ""}

Travel plan:
${aiResult.slice(0, 8000)}`,
    }],
  });

  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const raw = block?.input as { days?: unknown } | undefined;

  if (!raw?.days || !Array.isArray(raw.days)) {
    return NextResponse.json({ error: "Could not extract timeline" }, { status: 500 });
  }

  return NextResponse.json({ days: raw.days });
}
