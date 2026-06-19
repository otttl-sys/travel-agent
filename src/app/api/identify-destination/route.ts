import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const client = new Anthropic();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image type (jpeg/png/webp/gif only)" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 4 MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as AllowedType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze this travel photo. Identify the destination as specifically as possible — prefer city/landmark over country when clearly recognizable.

Return ONLY a JSON object, no markdown, no code fences, no extra text:
{
  "destination": "most specific name (e.g. 'Santorini', 'Kyoto', 'Patagonia', 'Sahara Desert')",
  "country": "country name in English",
  "region": "broader region (e.g. 'Greek Islands', 'Southeast Asia', 'South America')",
  "confidence": "high" | "medium" | "low",
  "interests": ["array of 1-4 matching interests from: culture, nature, beach, city, adventure, food, luxury, wellness, family, nightlife"],
  "tagline": "one evocative phrase, max 6 words",
  "could_not_identify": false
}

If this is NOT a recognizable travel destination (portrait, food close-up, abstract, office, screenshot of text, etc.):
{"could_not_identify": true}`,
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    // Strip accidental markdown code fences
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[identify-destination]", err);
    return NextResponse.json({ error: "Analysis failed — please try again" }, { status: 500 });
  }
}
