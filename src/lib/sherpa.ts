import Anthropic from "@anthropic-ai/sdk";
import type { VisaRequirement, EVisaAction } from "@/components/visa-card";

// --- Sherpa API response types ---

type SherpaInformationGroup = {
  type?: string;
  title?: string;
  description?: string;
  enforcement?: string;
};

type SherpaAction = {
  label?: string;
  url?: string;
  totalAmount?: number;
  currency?: string;
};

type SherpaProcedure = {
  type: string;
  attributes: {
    title?: string;
    actions?: SherpaAction[];
  };
};

export type SherpaTripsResponse = {
  data: {
    attributes: {
      headline?: string;
      travelOpenness?: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "NO_INFORMATION";
      informationGroups?: SherpaInformationGroup[];
    };
  };
  included?: SherpaProcedure[];
};

// --- ISO code resolver ---

const client = new Anthropic();

const isoCodeTool: Anthropic.Tool = {
  name: "resolve_iso_codes",
  description: "Resolve a passport nationality and destination into ISO 3166-1 alpha-3 country codes.",
  input_schema: {
    type: "object" as const,
    properties: {
      passportIso: {
        type: "string",
        description: "ISO 3166-1 alpha-3 for the passport, e.g. DEU, USA, GBR, FRA, AUT",
      },
      destinationIso: {
        type: "string",
        description: "ISO 3166-1 alpha-3 for the destination country, e.g. JPN, ITA, THA, IDN",
      },
    },
    required: ["passportIso", "destinationIso"],
  },
};

export async function resolveIsoCodes(
  passport: string,
  destination: string
): Promise<{ passportIso: string; destinationIso: string }> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tool_choice: { type: "any" },
    tools: [isoCodeTool],
    messages: [
      {
        role: "user",
        content: `Resolve to ISO 3166-1 alpha-3 codes:\n- Passport / nationality: "${passport}"\n- Destination (city or country): "${destination}"\n\nFor a city (e.g. Tokyo, Rome, Bali), return the country code (JPN, ITA, IDN). Call resolve_iso_codes now.`,
      },
    ],
  });

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "resolve_iso_codes"
  );

  if (!block) throw new Error("ISO code resolution failed");

  const input = block.input as { passportIso?: string; destinationIso?: string };
  return {
    passportIso: (input.passportIso ?? "DEU").toUpperCase(),
    destinationIso: (input.destinationIso ?? "UNK").toUpperCase(),
  };
}

// --- Response mapper ---

const CATEGORY_ICONS: Record<string, string> = {
  VISA: "🛂",
  HEALTH: "💉",
  ENTRY: "🛃",
  CUSTOMS: "📦",
  PASSPORT: "📘",
  VACCINATION: "💉",
  INSURANCE: "🏥",
  COVID: "🦠",
  CURRENCY: "💱",
};

const OPENNESS_STATUS: Record<string, VisaRequirement["status"]> = {
  LEVEL_1: "not-required", // visa-free / open
  LEVEL_2: "check",        // eVisa or on-arrival
  LEVEL_3: "required",     // visa required
  LEVEL_4: "required",     // restricted / closed
  NO_INFORMATION: "check",
};

function deriveStatus(enforcement?: string, openness?: string): VisaRequirement["status"] {
  const e = enforcement?.toUpperCase();
  if (e === "REQUIRED") return "required";
  if (e === "EXEMPT" || e === "NOT_REQUIRED") return "not-required";
  if (e === "CONDITIONAL" || e === "RECOMMENDED") return "check";
  return OPENNESS_STATUS[openness ?? "NO_INFORMATION"] ?? "info";
}

export function mapSherpaResponse(data: SherpaTripsResponse): {
  requirements: VisaRequirement[];
  eVisaLinks: EVisaAction[];
} {
  const requirements: VisaRequirement[] = [];
  const eVisaLinks: EVisaAction[] = [];

  const openness = data.data.attributes.travelOpenness ?? "NO_INFORMATION";

  // Headline card summarising overall entry status
  if (data.data.attributes.headline) {
    requirements.push({
      icon: "🌍",
      category: "Entry",
      status: OPENNESS_STATUS[openness] ?? "check",
      title: "Entry Status",
      details: data.data.attributes.headline,
    });
  }

  // One card per information group
  for (const group of data.data.attributes.informationGroups ?? []) {
    const key = (group.type ?? "").toUpperCase();
    const icon = CATEGORY_ICONS[key] ?? "ℹ️";
    const category =
      group.type
        ? group.type.charAt(0).toUpperCase() + group.type.slice(1).toLowerCase()
        : "Info";

    requirements.push({
      icon,
      category,
      status: deriveStatus(group.enforcement, openness),
      title: group.title ?? category,
      details: group.description ?? "See official sources for current details.",
    });
  }

  // Extract eVisa purchase links from included PROCEDURE objects
  for (const item of data.included ?? []) {
    if (item.type !== "PROCEDURE") continue;
    for (const action of item.attributes.actions ?? []) {
      if (!action.url) continue;
      eVisaLinks.push({
        label: action.label ?? `Apply: ${item.attributes.title ?? "eVisa"}`,
        url: action.url,
        price:
          action.totalAmount != null
            ? `${action.currency ?? "USD"} ${action.totalAmount}`
            : undefined,
      });
    }
  }

  return { requirements, eVisaLinks };
}

export const SHERPA_DISCLAIMER =
  "Visa and entry requirements change frequently. Always verify the latest rules with the official embassy or consulate of your destination before booking.";
