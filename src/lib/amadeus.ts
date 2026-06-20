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

// Amadeus Hotel API uses IATA *city* codes, which differ from airport codes for some cities.
const HOTEL_CITY: Record<string, string> = {
  london: "LON", "london heathrow": "LON", "london gatwick": "LON",
  paris: "PAR", "new york": "NYC", tokyo: "TYO", osaka: "OSA", kyoto: "OSA",
  rome: "ROM", milan: "MIL", "milan malpensa": "MIL",
  seoul: "SEL", beijing: "BJS", shanghai: "SHA",
  "sao paulo": "SAO", "buenos aires": "BUE", "rio de janeiro": "RIO",
  "ho chi minh city": "SGN", saigon: "SGN",
  jakarta: "JKT",
};

function cityToHotelCode(city: string): string | null {
  const key = city.toLowerCase().trim().split(",")[0].trim();
  if (HOTEL_CITY[key]) return HOTEL_CITY[key];
  const firstWord = key.split(/[\s]/)[0];
  for (const [k, v] of Object.entries(HOTEL_CITY)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Fall back to airport IATA — works for most European/Asian cities (BER, MUC, BKK …)
  return IATA[key] ?? IATA[firstWord] ?? cityToIATA(city);
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

function addDays(base: string | undefined, n: number): string {
  const d = base ? new Date(base) : new Date();
  if (isNaN(d.getTime())) { const f = new Date(); f.setDate(f.getDate() + n); return f.toISOString().split("T")[0]; }
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// Fallback date: 30 days from today (used when AI doesn't pass a concrete date)
function defaultDepartureDate(): string {
  return addDays(undefined, 30);
}

export interface FlightResult {
  source: "amadeus";
  originCode: string;
  destCode: string;
  priceRange: string;
  cheapestPrice: number;
  offers: Array<{ price: string; airline: string; duration: string; stops: string }>;
}

export interface HotelResult {
  source: "amadeus";
  destination: string;
  cityCode: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  priceRange: string;
  cheapestPerNight: number;
  hotels: Array<{ name: string; stars: string; pricePerNight: string; roomType: string }>;
}

export async function searchAmadeusHotels(params: {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  style?: string;
}): Promise<HotelResult> {
  const cityCode = cityToHotelCode(params.destination);
  if (!cityCode) throw new Error(`No city code for: ${params.destination}`);

  const checkIn = params.checkIn || addDays(undefined, 30);
  const checkOut = params.checkOut || addDays(checkIn, 7);
  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  );

  // luxury style → 4-5 stars only; budget → 2-3; default → 3-5
  const ratings = params.style?.toLowerCase().includes("luxury")
    ? "4,5"
    : params.style?.toLowerCase().includes("budget")
    ? "2,3"
    : "3,4,5";

  const token = await getToken();

  // Step 1: hotel IDs by city
  const listQs = new URLSearchParams({
    cityCode,
    radius: "5",
    radiusUnit: "KM",
    ratings,
    hotelSource: "ALL",
  });
  const listRes = await fetch(`${BASE}/v1/reference-data/locations/hotels/by-city?${listQs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) throw new Error(`Hotel list ${listRes.status}`);
  const listData = await listRes.json();
  const hotelIds: string[] = (listData.data ?? [])
    .slice(0, 8)
    .map((h: { hotelId: string }) => h.hotelId);
  if (hotelIds.length === 0) throw new Error("No hotels found for city");

  // Step 2: hotel offers (prices)
  const offersQs = new URLSearchParams({
    hotelIds: hotelIds.join(","),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    adults: String(Math.max(1, params.adults)),
    roomQuantity: "1",
    currency: "EUR",
    bestRateOnly: "true",
  });
  const offersRes = await fetch(`${BASE}/v3/shopping/hotel-offers?${offersQs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!offersRes.ok) throw new Error(`Hotel offers ${offersRes.status}`);
  const offersData = await offersRes.json();

  type RawHotel = {
    hotel: { name: string; rating?: string };
    offers: Array<{ price: { total: string }; room?: { description?: { text: string } } }>;
  };
  const items: RawHotel[] = offersData.data ?? [];
  if (items.length === 0) throw new Error("No hotel offers available");

  const hotels = items.map((item) => {
    const offer = item.offers[0];
    const total = parseFloat(offer.price.total);
    const perNight = total / nights;
    return {
      name: item.hotel.name,
      stars: item.hotel.rating ?? "–",
      pricePerNight: `€${perNight.toFixed(0)}`,
      perNightNum: perNight,
      roomType: offer.room?.description?.text?.split(/[\n\r]/)[0]?.slice(0, 60) ?? "Standard Room",
    };
  });

  const prices = hotels.map((h) => h.perNightNum);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    source: "amadeus",
    destination: params.destination,
    cityCode,
    checkIn,
    checkOut,
    nights,
    priceRange: min === max ? `€${min.toFixed(0)}/night` : `€${min.toFixed(0)}–€${max.toFixed(0)}/night`,
    cheapestPerNight: min,
    hotels: hotels.map(({ name, stars, pricePerNight, roomType }) => ({
      name, stars, pricePerNight, roomType,
    })),
  };
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

// ── Tours & Activities ────────────────────────────────────────────────────────

async function getCityCoordinates(city: string): Promise<{ lat: number; lng: number }> {
  const token = await getToken();
  const qs = new URLSearchParams({ keyword: city.split(",")[0].trim(), max: "1" });
  const res = await fetch(`${BASE}/v1/reference-data/locations/cities?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`City lookup ${res.status}`);
  const data = await res.json();
  const item = data.data?.[0];
  if (!item?.geoCode) throw new Error(`No coordinates for: ${city}`);
  return { lat: item.geoCode.latitude, lng: item.geoCode.longitude };
}

export interface ActivityResult {
  source: "amadeus";
  destination: string;
  count: number;
  cheapestPrice: number;
  priceRange: string;
  activities: Array<{
    name: string;
    description: string;
    price: string;
    rating: string;
    category: string;
  }>;
}

export async function searchAmadeusActivities(params: {
  destination: string;
  interests?: string[];
  durationDays?: number;
}): Promise<ActivityResult> {
  const { lat, lng } = await getCityCoordinates(params.destination);
  const token = await getToken();

  const qs = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    radius: "20", // 20 km covers a whole city
  });

  const res = await fetch(`${BASE}/v1/shopping/activities?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Activities ${res.status}`);
  const data = await res.json();

  type RawActivity = {
    name: string;
    shortDescription?: string;
    price?: { amount: string; currencyCode: string };
    rating?: string;
    subType?: string;
  };

  const raw: RawActivity[] = data.data ?? [];
  if (raw.length === 0) throw new Error("No activities found");

  // Keyword-rank by interest terms so relevant results float up
  const interestKeywords = (params.interests ?? [])
    .flatMap((i) => i.toLowerCase().split(/[\s,]+/));

  const scored = raw.map((a) => {
    const text = `${a.name} ${a.shortDescription ?? ""} ${a.subType ?? ""}`.toLowerCase();
    const score = interestKeywords.filter((kw) => text.includes(kw)).length;
    return { a, score };
  });
  scored.sort((x, y) => y.score - x.score);

  const activities = scored.slice(0, 10).map(({ a }) => {
    const priceNum = a.price?.amount ? parseFloat(a.price.amount) : 0;
    return {
      name: a.name,
      description: (a.shortDescription ?? "").slice(0, 140),
      price: priceNum > 0 ? `€${priceNum.toFixed(0)}` : "free / price on request",
      priceNum,
      rating: a.rating ?? "–",
      category: a.subType ?? "Activity",
    };
  });

  const prices = activities.map((a) => a.priceNum).filter((p) => p > 0);
  const cheapest = prices.length > 0 ? Math.min(...prices) : 0;
  const priciest = prices.length > 0 ? Math.max(...prices) : 0;

  return {
    source: "amadeus",
    destination: params.destination,
    count: activities.length,
    cheapestPrice: cheapest,
    priceRange: cheapest === 0
      ? "free / price on request"
      : cheapest === priciest
      ? `from €${cheapest.toFixed(0)}`
      : `€${cheapest.toFixed(0)}–€${priciest.toFixed(0)}`,
    activities: activities.map(({ name, description, price, rating, category }) => ({
      name, description, price, rating, category,
    })),
  };
}
