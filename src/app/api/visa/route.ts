import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";
import { resolveIsoCodes, mapSherpaResponse, SHERPA_DISCLAIMER, type SherpaTripsResponse } from "@/lib/sherpa";

export const maxDuration = 300;

const client = new Anthropic();

// ─── Sherpa fast path ─────────────────────────────────────────────────────────
// Activated automatically when SHERPA_API_KEY is set in the environment.
// Add it to Doppler (project: travel-agent) to switch from Tavily to Sherpa.

async function handleSherpa(
  destination: string,
  startDate: string,
  passport: string,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
) {
  // Step 1: resolve freetext → ISO 3166-1 alpha-3 codes (tiny Haiku call)
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({ type: "tool_call", id: "iso", tool: "resolve_iso_codes", input: { passport, destination }, iteration: 1 })}\n\n`
    )
  );
  const { passportIso, destinationIso } = await resolveIsoCodes(passport, destination);
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "iso", tool: "resolve_iso_codes" })}\n\n`)
  );

  // Step 2: single Sherpa API call
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({ type: "tool_call", id: "sherpa", tool: "sherpa_requirements_api", input: { passportIso, destinationIso }, iteration: 2 })}\n\n`
    )
  );
  const res = await fetch(
    "https://requirements-api.joinsherpa.com/v3/trips?include=restriction,procedure",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        "x-api-key": process.env.SHERPA_API_KEY!,
      },
      body: JSON.stringify({
        data: {
          type: "TRIP",
          attributes: {
            locale: "en-US",
            currency: "EUR",
            traveller: { passports: [passportIso] },
            travelNodes: [
              {
                type: "ORIGIN",
                locationCode: passportIso,
                departure: { date: startDate || new Date().toISOString().slice(0, 10), travelMode: "AIR" },
              },
              {
                type: "DESTINATION",
                locationCode: destinationIso,
                arrival: { date: startDate || new Date().toISOString().slice(0, 10), travelMode: "AIR" },
              },
            ],
          },
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Sherpa API error: ${res.status}`);
  const data = (await res.json()) as SherpaTripsResponse;

  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "sherpa", tool: "sherpa_requirements_api" })}\n\n`)
  );

  // Step 3: pure transform — no AI involved
  const { requirements, eVisaLinks } = mapSherpaResponse(data);

  if (requirements.length > 0) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: "visa", requirements, disclaimer: SHERPA_DISCLAIMER })}\n\n`)
    );
  }
  if (eVisaLinks.length > 0) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: "evisa_actions", actions: eVisaLinks })}\n\n`)
    );
  }
  if (requirements.length === 0) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: "error", message: "No requirements returned by Sherpa." })}\n\n`)
    );
  }
}

// ─── Tavily fallback path ─────────────────────────────────────────────────────

const searchTool: Anthropic.Tool = {
  name: "search_visa_requirements",
  description: "Search the web for visa and entry requirements for a specific passport holder traveling to a destination.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "A focused search query about visa or entry requirements" },
    },
    required: ["query"],
  },
};

async function tavilySearch(query: string): Promise<string> {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  try {
    const result = await tvly.search(query, { searchDepth: "basic", maxResults: 4 });
    return JSON.stringify({ results: result.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })) });
  } catch {
    return JSON.stringify({ error: "Search unavailable", results: [] });
  }
}

const TAVILY_SYSTEM_PROMPT = `You are a visa and entry requirements researcher. Your job: find accurate, current requirements for a specific passport holder traveling to a destination.

Work in two phases:
1. Call search_visa_requirements 3-4 times covering: visa requirements, health requirements, entry rules, customs rules.
2. After research, stop using tools — you will be asked to call generate_visa_report once.

CRITICAL RULES:
- Never invent specific requirements your research did not confirm.
- If information is conflicting, report the stricter requirement and flag it as check.
- Be specific: "passport must be valid for at least 6 months beyond entry date" not "valid passport required".
- status: "required" = mandatory, "not-required" = confirmed exempt, "check" = uncertain, "info" = helpful tip.
- Do not use quotation marks in any text fields.`;

async function handleTavily(
  destination: string,
  startDate: string,
  endDate: string,
  passport: string,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
) {
  const userMessage = `Find visa and entry requirements for this trip:
- Destination: ${destination || "unknown"}
- Travel dates: ${startDate || "?"} to ${endDate || "?"}
- Passport / Nationality: ${passport || "German / EU"}

Search thoroughly for visa requirements, health requirements, entry rules, and customs rules.`.trim();

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  let continueLoop = true;
  let iterations = 0;

  while (continueLoop && iterations < 5) {
    iterations++;
    const apiStream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1536,
      system: TAVILY_SYSTEM_PROMPT,
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
          const content = await tavilySearch(String((toolUse.input as Record<string, unknown>).query ?? ""));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: toolUse.id, tool: toolUse.name })}\n\n`)
          );
          return { type: "tool_result" as const, tool_use_id: toolUse.id, content };
        })
      );
      messages.push({ role: "user", content: toolResults });
    } else {
      continueLoop = false;

      // Forced structured output
      const visaTool: Anthropic.Tool = {
        name: "generate_visa_report",
        description: "Generate the final structured visa and entry requirements report.",
        input_schema: {
          type: "object" as const,
          properties: {
            requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  icon: { type: "string" },
                  category: { type: "string", description: "One of: Visa, Health, Entry, Customs, Tips" },
                  status: { type: "string", enum: ["required", "not-required", "check", "info"] },
                  title: { type: "string" },
                  details: { type: "string", description: "2-3 sentences, no markdown, no quotation marks" },
                },
                required: ["icon", "category", "status", "title", "details"],
              },
            },
            disclaimer: { type: "string" },
          },
          required: ["requirements", "disclaimer"],
        },
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "tool_call", id: "visa", tool: "generate_visa_report", input: { destination, passport }, iteration: iterations + 1 })}\n\n`)
      );

      type RawResult = { requirements?: unknown; disclaimer?: unknown };
      let result: RawResult | undefined;
      let lastError: string | null = null;
      const baseInstruction =
        "Now call generate_visa_report. requirements must be a native JSON array of objects, not a string. No quotation marks in text fields.";

      for (let attempt = 0; attempt < 3 && !(Array.isArray(result?.requirements) && (result.requirements as unknown[]).length > 0); attempt++) {
        const instruction =
          attempt === 0
            ? baseInstruction
            : `Previous attempt invalid (${lastError}). requirements must be a native JSON array. Try again.`;

        const visaResponse = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          tool_choice: { type: "any" },
          tools: [visaTool],
          messages: [
            ...messages,
            { role: "assistant", content: finalMessage.content },
            { role: "user", content: instruction },
          ],
        });

        const visaBlock = visaResponse.content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "generate_visa_report"
        );
        const raw = visaBlock?.input as RawResult | undefined;

        if (raw) {
          let reqs = raw.requirements;
          if (typeof reqs === "string") {
            try { reqs = JSON.parse(reqs); } catch (e) {
              lastError = e instanceof Error ? e.message : "invalid JSON";
              reqs = undefined;
            }
          }
          if (Array.isArray(reqs) && reqs.length > 0) {
            result = { requirements: reqs, disclaimer: raw.disclaimer };
          } else {
            lastError = "requirements missing or empty";
          }
        } else {
          lastError = "tool block not found";
        }
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "tool_done", id: "visa", tool: "generate_visa_report" })}\n\n`)
      );

      if (result && Array.isArray(result.requirements) && result.requirements.length > 0) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "visa", requirements: result.requirements, disclaimer: result.disclaimer ?? "" })}\n\n`)
        );
      } else {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Could not generate visa report." })}\n\n`)
        );
      }
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, passport } = await req.json() as {
    destination?: string;
    startDate?: string;
    endDate?: string;
    passport?: string;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (process.env.SHERPA_API_KEY) {
          await handleSherpa(destination ?? "", startDate ?? "", passport ?? "German", encoder, controller);
        } else {
          await handleTavily(destination ?? "", startDate ?? "", endDate ?? "", passport ?? "German / EU", encoder, controller);
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
