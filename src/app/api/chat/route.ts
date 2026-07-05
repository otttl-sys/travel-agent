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
      travelers: { type: "number", description: "Number of ADULT travelers only — do not count children here, they go in the children array" },
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
      includeFlights: { type: "boolean", description: "False if the user already has flights sorted or said they're flying separately/cheaply themselves. Defaults to true." },
      includeHotel: { type: "boolean", description: "False if the user already has accommodation sorted, e.g. staying with a friend/family. Defaults to true." },
      children: {
        type: "array",
        description: "Children traveling along, if mentioned (e.g. a 3-year-old daughter). Do not add a child here AND count them in travelers.",
        items: {
          type: "object",
          properties: {
            age: { type: "number" },
            gender: { type: "string", enum: ["boy", "girl", "unspecified"] },
          },
          required: ["age"],
        },
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
- travelers = adult travelers only. If the user mentions a child/kid traveling with them (e.g. "with my 3-year-old daughter", "no partner, just me and my son"), put the child in the children array and do NOT add them to travelers — a solo parent traveling with one child is travelers: 1, children: [{...}].
- If the user says they already have flights sorted, are flying separately, or staying with a friend/family — set includeFlights/includeHotel to false accordingly instead of assuming a package trip.
- Keep replies short: 1-2 sentences max. No bullet lists. No formal headers.
- Default travelers to 2 only if genuinely ambiguous — if the user's phrasing implies solo or solo-with-child, use that instead.`,
    tools: [PLAN_TRIP_TOOL],
    messages,
  });

  return NextResponse.json({
    content: response.content,
    stop_reason: response.stop_reason,
  });
}
