// Amadeus Flight Offers Search — test.api.amadeus.com (sandbox)
// Production: set AMADEUS_PRODUCTION=1 → switches to api.amadeus.com

const BASE =
  process.env.AMADEUS_PRODUCTION === "1"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

// City / country → IATA airport code
const IATA: Record<string, string> = {
  // Germany
  berlin: "BER", munich: "MUC", münchen: "MUC", frankfurt: "FRA",
  hamburg: "HAM", düsseldorf: "DUS", cologne: "CGN", köln: "CGN",
  stuttgart: "STR", nuremberg: "NUE", nürnberg: "NUE", hanover: "HAJ",
  // Austria / Switzerland
  vienna: "VIE", wien: "VIE", zurich: "ZRH", zürich: "ZRH", geneva: "GVA",
  salzburg: "SZG", innsbruck: "INN",
  // UK / Ireland
  london: "LHR", "london gatwick": "LGW", "london heathrow": "LHR",
  manchester: "MAN", edinburgh: "EDI", dublin: "DUB",
  // Western Europe
  paris: "CDG", amsterdam: "AMS", brussels: "BRU", madrid: "MAD",
  barcelona: "BCN", lisbon: "LIS", porto: "OPO", nice: "NCE",
  marseille: "MRS", lyon: "LYS", milan: "MXP", rome: "FCO",
  venice: "VCE", florence: "FLR", naples: "NAP",
  // Northern Europe
  copenhagen: "CPH", stockholm: "ARN", oslo: "OSL", helsinki: "HEL",
  reykjavik: "KEF",
  // Eastern Europe
  athens: "ATH", istanbul: "IST", prague: "PRG", budapest: "BUD",
  warsaw: "WAW", krakow: "KRK", bucharest: "OTP", zagreb: "ZAG",
  dubrovnik: "DBV", split: "SPU", ljubliana: "LJU",
  // Americas
  "new york": "JFK", "los angeles": "LAX", miami: "MIA", chicago: "ORD",
  "san francisco": "SFO", "mexico city": "MEX", cancun: "CUN",
  havana: "HAV", bogota: "BOG", cartagena: "CTG", medellin: "MDE",
  "buenos aires": "EZE", "rio de janeiro": "GIG", "sao paulo": "GRU",
  lima: "LIM", santiago: "SCL", quito: "UIO", "costa rica": "SJO",
  "san jose": "SJO",
  // Asia
  tokyo: "NRT", osaka: "KIX", kyoto: "KIX", beijing: "PEK",
  shanghai: "PVG", "hong kong": "HKG", singapore: "SIN",
  bangkok: "BKK", bali: "DPS", denpasar: "DPS",
  "kuala lumpur": "KUL", seoul: "ICN", taipei: "TPE",
  delhi: "DEL", "new delhi": "DEL", mumbai: "BOM",
  "ho chi minh city": "SGN", "saigon": "SGN", hanoi: "HAN",
  "phnom penh": "PNH", "chiang mai": "CNX", phuket: "HKT",
  kathmandu: "KTM", colombo: "CMB",
  // Middle East
  dubai: "DXB", "abu dhabi": "AUH", doha: "DOH", riyadh: "RUH",
  "tel aviv": "TLV", amman: "AMM", muscat: "MCT",
  // Africa
  cairo: "CAI", nairobi: "NBO", "cape town": "CPT",
  johannesburg: "JNB", marrakech: "RAK", casablanca: "CMN",
  zanzibar: "ZNZ", "addis ababa": "ADD", kigali: "KGL",
  // Oceania / Pacific
  sydney: "SYD", melbourne: "MEL", brisbane: "BNE", perth: "PER",
  auckland: "AKL", queenstown: "ZQN",
  tahiti: "PPT", papeete: "PPT", maldives: "MLE", male: "MLE",
  seychelles: "SEZ", mauritius: "MRU",
};

export function cityToIATA(city: string): string | null {
  const key = city.toLowerCase().trim();
  if (IATA[key]) return IATA[key];
  // Partial match — handle "Berlin, Germany", "Tokyo, Japan" etc.
  const firstWord = key.split(/[,\s]/)[0];
  if (IATA[firstWord]) return IATA[firstWord];
  for (const [k, v] of Object.entries(IATA)) {
    if (key.includes(k)) return v;
  }
  return null;
}

// Parse Amadeus ISO 8601 duration e.g. "PT10H30M" → "10h 30m"
function parseDuration(d: string): string {
  const h = d.match(/(\d+)H/)?.[1];
  const m = d.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ") || d;
}

// In-memory token cache (reused within the same function invocation)
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const res = await fetch(`${BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Amadeus auth ${res.status}`);
  const d = await res.json();
  tokenCache = { value: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  return tokenCache.value;
}

// Fallback date: 30 days from today (used when AI doesn't pass a concrete date)
function defaultDepartureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export interface FlightResult {
  source: "amadeus";
  originCode: string;
  destCode: string;
  priceRange: string;
  cheapestPrice: number;
  offers: Array<{ price: string; airline: string; duration: string; stops: string }>;
}

export async function searchAmadeusFlights(params: {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  adults: number;
}): Promise<FlightResult> {
  const originCode = cityToIATA(params.origin);
  const destCode = cityToIATA(params.destination);
  if (!originCode) throw new Error(`No IATA code for origin: ${params.origin}`);
  if (!destCode) throw new Error(`No IATA code for destination: ${params.destination}`);

  const token = await getToken();
  const qs = new URLSearchParams({
    originLocationCode: originCode,
    destinationLocationCode: destCode,
    departureDate: params.departureDate || defaultDepartureDate(),
    adults: String(Math.max(1, params.adults)),
    max: "5",
    currencyCode: "EUR",
  });
  if (params.returnDate) qs.set("returnDate", params.returnDate);

  const res = await fetch(`${BASE}/v2/shopping/flight-offers?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Amadeus search ${res.status}`);

  const data = await res.json();
  const raw: Array<Record<string, unknown>> = data.data ?? [];
  if (raw.length === 0) throw new Error("No flights found");

  const offers = raw.map((offer) => {
    const price = offer.price as { total: string; currency: string };
    const itin = (offer.itineraries as Array<{ duration: string; segments: Array<{ carrierCode: string }> }>)[0];
    const stops = itin.segments.length - 1;
    return {
      price: `€${parseFloat(price.total).toFixed(0)}`,
      priceNum: parseFloat(price.total),
      airline: itin.segments[0]?.carrierCode ?? "",
      duration: parseDuration(itin.duration),
      stops: stops === 0 ? "direct" : `${stops} stop${stops > 1 ? "s" : ""}`,
    };
  });

  const prices = offers.map((o) => o.priceNum);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    source: "amadeus",
    originCode,
    destCode,
    priceRange: min === max ? `€${min.toFixed(0)} per person` : `€${min.toFixed(0)}–€${max.toFixed(0)} per person`,
    cheapestPrice: min,
    offers: offers.slice(0, 3).map(({ price, airline, duration, stops }) => ({
      price, airline, duration, stops,
    })),
  };
}
