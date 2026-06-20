import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export const maxDuration = 60;

const GRADIENTS = [
  "from-rose-400 to-orange-300",
  "from-emerald-400 to-teal-300",
  "from-violet-400 to-indigo-300",
  "from-amber-400 to-yellow-300",
  "from-sky-400 to-blue-300",
] as const;

export type DiscoverCard = {
  id: string;
  destination: string;
  country: string;
  emoji: string;
  tagline: string;
  whyNow: string;
  climate: string;
  highlights: string[];
  priceFrom: number;
  priceTo: number;
  gradient: string;
};

const discoverTool: Anthropic.Tool = {
  name: "suggest_destinations",
  description:
    "Suggest 5 travel destinations that are ideal for the given month, interests, and budget.",
  input_schema: {
    type: "object" as const,
    properties: {
      destinations: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            destination: { type: "string", description: "City or region name" },
            country: { type: "string" },
            emoji: { type: "string", description: "Single emoji representing this place" },
            tagline: { type: "string", description: "Why this month is magical here — max 6 words" },
            whyNow: {
              type: "string",
              description:
                "2 sentences: why this destination peaks in the given month (weather window, festival, off-peak value, etc.)",
            },
            climate: {
              type: "string",
              description: "Temperature range + weather summary, e.g. '22–28 °C, sunny & dry'",
            },
            highlights: {
              type: "array",
              items: { type: "string" },
              description: "3–4 seasonal highlights specific to this month",
            },
            priceFrom: {
              type: "number",
              description:
                "Low-end estimate (EUR) for a 7-night trip per person from Germany, incl. flights + accommodation",
            },
            priceTo: {
              type: "number",
              description: "High-end estimate for the same trip",
            },
            gradient: { type: "string", enum: GRADIENTS },
          },
          required: [
            "id",
            "destination",
            "country",
            "emoji",
            "tagline",
            "whyNow",
            "climate",
            "highlights",
            "priceFrom",
            "priceTo",
            "gradient",
          ],
        },
      },
    },
    required: ["destinations"],
  },
};

export async function POST(req: NextRequest) {
  const { month, interests, budget } = await req.json();

  const interestList = Array.isArray(interests) && interests.length > 0
    ? interests.join(", ")
    : "general travel";

  const prompt = `Suggest 5 destinations ideal for traveling in ${month}.

Traveler profile:
- Interests: ${interestList}
- Budget level: ${budget ?? "balanced"} (scale: ultra-budget → budget → balanced → premium → luxury)

Rules:
- Each destination must genuinely shine in ${month} — peak season, ideal weather, local festival, or smart off-peak value.
- Spread across different continents / regions — no two suggestions from the same country.
- Highlights must be month-specific (what is happening or what makes ${month} special there).
- Price estimates: 7-night round-trip per person from Germany, including flights + accommodation, calibrated to the budget level.
- All text in English.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    tool_choice: { type: "any" },
    tools: [discoverTool],
    system: [
      {
        type: "text",
        text: "You are a world-class travel advisor with encyclopedic knowledge of seasonal travel patterns, global festivals, and weather windows. Respond only via the suggest_destinations tool.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "suggest_destinations"
  );

  if (!toolBlock) {
    return NextResponse.json({ error: "No suggestions generated" }, { status: 500 });
  }

  const { destinations } = toolBlock.input as { destinations: DiscoverCard[] };
  return NextResponse.json({ destinations });
}
