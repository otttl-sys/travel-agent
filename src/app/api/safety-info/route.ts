import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

type WeatherDay = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  code: number;
};

export type SafetyData = {
  country: string;
  countryCode: string;
  location: string;
  aaWarning: {
    level: "none" | "notice" | "partial" | "warning" | "unknown";
    url: string;
  };
  weather: {
    available: boolean;
    days: WeatherDay[];
    summary: string;
    alerts: string[];
    label: string;
  };
};

const WX_DESC: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
};

function wxDesc(code: number): string {
  return WX_DESC[code] ?? WX_DESC[Math.floor(code / 10) * 10] ?? "Variable";
}

function wxEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination")?.trim() || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  if (!destination) {
    return NextResponse.json({ error: "No destination" }, { status: 400 });
  }

  // 1. Geocode
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`,
    { next: { revalidate: 86400 } }
  );
  const geoData = await geoRes.json();
  const geo = geoData.results?.[0] ?? null;

  const country: string = geo?.country ?? destination;
  const countryCode: string = (geo?.country_code ?? "").toUpperCase();
  const location: string = geo?.name ?? destination;
  const lat: number | undefined = geo?.latitude;
  const lon: number | undefined = geo?.longitude;

  // 2. AA travel warning — open data JSON list
  let level: SafetyData["aaWarning"]["level"] = "unknown";
  let aaUrl = "https://www.auswaertiges-amt.de/de/service/laender-informationen";
  try {
    const aaRes = await fetch("https://www.auswaertiges-amt.de/opendata/travelwarning", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (aaRes.ok) {
      const aaData = await aaRes.json();
      // Response: { response: { items: { "JP": { warning, partialWarning, contentUrl, ... } } } }
      const items =
        aaData?.response?.items ??
        aaData?.items ??
        (typeof aaData === "object" ? aaData : null);

      if (items && countryCode && items[countryCode]) {
        const c = items[countryCode];
        if (c.warning) level = "warning";
        else if (c.partialWarning) level = "partial";
        else if (c.uppertextShort || c.uppertextLong) level = "notice";
        else level = "none";
        // Use the country-specific page URL from the AA API if available
        if (c.contentUrl) aaUrl = c.contentUrl;
        else if (c.slug) aaUrl = `https://www.auswaertiges-amt.de/de/service/laender-informationen/${c.slug}`;
      } else if (items) {
        // Country not in list → assume safe
        level = "none";
      }
    }
  } catch {
    level = "unknown";
  }

  // 3. Weather (Open-Meteo, free, no key)
  let weatherDays: WeatherDay[] = [];
  let weatherSummary = "";
  const weatherAlerts: string[] = [];
  let weatherAvailable = false;
  let weatherLabel = "Current conditions";

  if (lat !== undefined && lon !== undefined) {
    try {
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
          `&timezone=auto&forecast_days=16`,
        { next: { revalidate: 3600 } }
      );
      const wxData = await wxRes.json();

      if (wxData.daily) {
        const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } =
          wxData.daily as {
            time: string[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
            precipitation_sum: number[];
            weathercode: number[];
          };

        const allDays: WeatherDay[] = time.map((date, i) => ({
          date,
          maxTemp: temperature_2m_max[i] ?? 0,
          minTemp: temperature_2m_min[i] ?? 0,
          precipitation: precipitation_sum[i] ?? 0,
          code: weathercode[i] ?? 0,
        }));

        // Try to filter to travel dates
        if (startDate) {
          const inRange = allDays.filter((d) => {
            if (d.date < startDate) return false;
            if (endDate && d.date > endDate) return false;
            return true;
          });
          if (inRange.length > 0) {
            weatherDays = inRange;
            weatherLabel = endDate
              ? `Forecast ${startDate} – ${endDate}`
              : `Forecast from ${startDate}`;
          } else {
            // Dates beyond 16-day window — show all we have
            weatherDays = allDays.slice(0, 7);
            weatherLabel = "Current 7-day conditions (travel dates beyond forecast window)";
          }
        } else {
          weatherDays = allDays.slice(0, 7);
          weatherLabel = "Current 7-day conditions";
        }

        weatherAvailable = weatherDays.length > 0;

        if (weatherAvailable) {
          const avgMax = Math.round(
            weatherDays.reduce((s, d) => s + d.maxTemp, 0) / weatherDays.length
          );
          const avgMin = Math.round(
            weatherDays.reduce((s, d) => s + d.minTemp, 0) / weatherDays.length
          );
          const rainyDays = weatherDays.filter((d) => d.precipitation > 5).length;
          const worstCode = weatherDays.reduce((m, d) => Math.max(m, d.code), 0);

          weatherSummary = `${wxEmoji(worstCode)} ${wxDesc(worstCode)} · ${avgMin}–${avgMax}°C${
            rainyDays > 0 ? ` · ${rainyDays} rainy day${rainyDays > 1 ? "s" : ""}` : ""
          }`;

          // Extreme alerts
          const seen = new Set<string>();
          for (const d of weatherDays) {
            if (d.maxTemp >= 38 && !seen.has("heat")) {
              seen.add("heat");
              weatherAlerts.push(`Extreme heat expected (up to ${Math.round(d.maxTemp)}°C)`);
            }
            if (d.minTemp <= -15 && !seen.has("cold")) {
              seen.add("cold");
              weatherAlerts.push(`Extreme cold (down to ${Math.round(d.minTemp)}°C)`);
            }
            if (d.precipitation >= 50 && !seen.has("flood")) {
              seen.add("flood");
              weatherAlerts.push(`Heavy rain / flooding risk (${Math.round(d.precipitation)}mm/day)`);
            }
            if (d.code >= 95 && !seen.has("storm")) {
              seen.add("storm");
              weatherAlerts.push("Thunderstorm forecast");
            }
          }
        }
      }
    } catch {
      // Weather not critical — silently skip
    }
  }

  const result: SafetyData = {
    country,
    countryCode,
    location,
    aaWarning: { level, url: aaUrl },
    weather: {
      available: weatherAvailable,
      days: weatherDays,
      summary: weatherSummary,
      alerts: weatherAlerts,
      label: weatherLabel,
    },
  };

  return NextResponse.json(result);
}
