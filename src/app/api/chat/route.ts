import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLAN_TRIP_TOOL: Anthropic.Tool = {
  name: "plan_trip",
  description:
    "Call this when you have enough information to plan the trip. Requires at least destination and number of travelers.",
  input_schema: {
    type: "object" as const,
    properties: {
      destination: { type: "string", description: "Main destination city or country" },
      origin: { type: "string", description: "Departure city (if mentioned)" },
      budget: { type: "number", description: "Budget per person in EUR (if mentioned)" },
      startDate: { type: "string", description: "Departure date YYYY-MM-DD (if mentioned)" },
      endDate: { type: "string", description: "Return date YYYY-MM-DD (if mentioned)" },
      travelers: { type: "number", description: "Number of travelers" },
      interests: {
        type: "array",
        items: { type: "string" },
        description: "Travel interests e.g. culture, food, beach, adventure, nature, family",
      },
      multiCity: { type: "boolean", description: "True if the user wants multiple cities" },
      cities: {
        type: "array",
        items: { type: "string" },
        description: "List of cities for multi-city trip",
      },
    },
    required: ["destination", "travelers"],
  },
};

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `You are Vagamundo's AI travel assistant — warm, concise, and knowledgeable.

Your goal: gather just enough information to plan a great trip, then call plan_trip.

Rules:
- Ask ONE question at a time, never multiple questions in one message.
- You need destination and travelers. Everything else is a bonus.
- If the user is vague ("somewhere warm", "a beach trip"), suggest 2-3 specific places and ask which appeals.
- As soon as you have destination + travelers, call plan_trip — don't keep asking.
- If budget/dates/interests are mentioned, capture them. If not, don't ask more than one follow-up.
- Keep replies short: 1-2 sentences max. No bullet lists. No formal headers.
- Default travelers to 2 if the user hasn't said and context doesn't make it obvious.`,
    tools: [PLAN_TRIP_TOOL],
    messages,
  });

  return NextResponse.json({
    content: response.content,
    stop_reason: response.stop_reason,
  });
}
