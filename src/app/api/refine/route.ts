import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { message, currentPlan, destination, budget, travelers, interests, startDate, endDate } =
    await req.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const write = (data: object) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      const tripContext = [
        destination && `Destination: ${destination}`,
        budget && `Budget: €${budget}/person`,
        startDate && endDate && `Dates: ${startDate} to ${endDate}`,
        travelers && `Travelers: ${travelers}`,
        interests && `Interests: ${interests}`,
      ]
        .filter(Boolean)
        .join(", ");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are an expert travel advisor refining a personalized trip plan based on traveler feedback.

Keep the same markdown structure and level of detail as the original plan. Address the traveler's request specifically and completely — make concrete changes to itinerary, pricing, hotels, activities as needed. Preserve everything that doesn't need to change. Never add meta-commentary like "I've updated the plan" — just deliver the revised plan directly.`,
        messages: [
          {
            role: "user",
            content: `Trip context: ${tripContext}\n\nCurrent plan:\n${currentPlan}\n\n---\n\nRevise this plan: ${message}`,
          },
        ],
        stream: true,
      });

      let fullText = "";
      for await (const event of response) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullText += event.delta.text;
          await write({ type: "token", text: event.delta.text });
        }
      }
      await write({ type: "result", text: fullText });
    } catch (err) {
      await write({
        type: "error",
        message: err instanceof Error ? err.message : "Refinement failed",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
