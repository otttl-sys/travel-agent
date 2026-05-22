import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const maxDuration = 60;

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, tripType, days } = await req.json();

  const tripContext = [
    destination && `Destination: ${destination}`,
    days && days > 0 && `Duration: ${days} days`,
    startDate && `Departure: ${startDate}`,
    tripType && `Trip type: ${tripType}`,
  ]
    .filter(Boolean)
    .join(". ");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Create a comprehensive, destination-specific packing list for this trip: ${tripContext}.

Format as markdown with these categories (use ## headings):
- Clothing & Footwear
- Toiletries & Health
- Documents & Money
- Electronics & Gadgets
- Destination-Specific Essentials
- Nice to Have

For each item use a checkbox: - [ ] Item name (brief note if helpful)

Be specific to the destination and climate — no generic filler. 5–8 items per category. If it's a warm beach destination, skip the heavy coat. If it's Japan, mention IC card. You get the idea.`,
            },
          ],
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ type: "token", text: chunk.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
