import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const WMO: Record<number, { icon: string; label: string }> = {
  0:  { icon: "☀️",  label: "Clear sky" },
  1:  { icon: "🌤️", label: "Mainly clear" },
  2:  { icon: "⛅",  label: "Partly cloudy" },
  3:  { icon: "☁️",  label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Icy fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌦️", label: "Heavy drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️",  label: "Heavy snow" },
  77: { icon: "🌨️", label: "Snow grains" },
  80: { icon: "🌦️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Heavy showers" },
  82: { icon: "⛈️",  label: "Violent showers" },
  85: { icon: "🌨️", label: "Snow showers" },
  86: { icon: "❄️",  label: "Heavy snow showers" },
  95: { icon: "⛈️",  label: "Thunderstorm" },
  96: { icon: "⛈️",  label: "Thunderstorm w/ hail" },
  99: { icon: "⛈️",  label: "Heavy thunderstorm" },
};

function wmo(code: number): { icon: string; label: string } {
  const keys = Object.keys(WMO).map(Number).sort((a, b) => a - b);
  let match = keys[0];
  for (const k of keys) { if (k <= code) match = k; else break; }
  return WMO[match] ?? { icon: "🌡️", label: "Unknown" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination") ?? "";
  const startDate   = searchParams.get("startDate") ?? "";
  const endDate     = searchParams.get("endDate") ?? "";

  if (!destination || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Geocoding via Nominatim — handles multilingual city names (e.g. "Lissabon" → Lisbon, Portugal)
  const destForGeo = destination.includes("→") ? destination.split("→")[0].trim() : destination;
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destForGeo)}&format=json&limit=3&featuretype=city&accept-language=en`,
    { headers: { "User-Agent": "travel-agent-portfolio/1.0" } }
  );
  const geoResults = await geoRes.json() as { lat: string; lon: string; display_name: string }[];
  if (!geoResults?.length) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }
  const latitude = parseFloat(geoResults[0].lat);
  const longitude = parseFloat(geoResults[0].lon);
  // Extract city, country from display_name ("Lisbon, Portugal" or "Lisbon, Lisbon, Portugal")
  const parts = geoResults[0].display_name.split(",").map(s => s.trim());
  const name = parts[0];
  const country = parts[parts.length - 1];
  const location = `${name}, ${country}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripStart = new Date(startDate);
  const daysUntilStart = Math.floor((tripStart.getTime() - today.getTime()) / 86400000);

  type RawDay = { date: string; maxTemp: number; minTemp: number; precipProb: number; windSpeed: number; icon: string; label: string };
  let days: RawDay[] = [];
  let mode: "forecast" | "historical" = "forecast";

  if (daysUntilStart <= 16) {
    // Live forecast — cap end date at today + 16 days
    const capMs = today.getTime() + 16 * 86400000;
    const forecastEnd = new Date(Math.min(new Date(endDate).getTime(), capMs)).toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max`
      + `&timezone=auto&start_date=${startDate}&end_date=${forecastEnd}&forecast_days=16`;
    const r = await fetch(url);
    const data = await r.json();
    const d = data.daily;
    if (d?.time?.length) {
      mode = "forecast";
      days = (d.time as string[]).map((date, i) => {
        const { icon, label } = wmo(d.weathercode[i] ?? 0);
        return { date, maxTemp: Math.round(d.temperature_2m_max[i] ?? 0), minTemp: Math.round(d.temperature_2m_min[i] ?? 0), precipProb: Math.round(d.precipitation_probability_max[i] ?? 0), windSpeed: Math.round(d.windspeed_10m_max[i] ?? 0), icon, label };
      });
    }
  }

  if (!days.length) {
    // Historical fallback: same calendar dates last year
    const ly = (iso: string) => { const d = new Date(iso); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); };
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max`
      + `&timezone=auto&start_date=${ly(startDate)}&end_date=${ly(endDate)}`;
    const r = await fetch(url);
    const data = await r.json();
    const d = data.daily;
    if (d?.time?.length) {
      mode = "historical";
      const yearOffset = new Date(startDate).getFullYear() - new Date(ly(startDate)).getFullYear();
      days = (d.time as string[]).map((date, i) => {
        const relabeled = new Date(date);
        relabeled.setFullYear(relabeled.getFullYear() + yearOffset);
        const precip = d.precipitation_sum[i] ?? 0;
        const precipProb = precip > 5 ? 80 : precip > 1 ? 50 : precip > 0 ? 20 : 5;
        const { icon, label } = wmo(d.weathercode[i] ?? 0);
        return { date: relabeled.toISOString().slice(0, 10), maxTemp: Math.round(d.temperature_2m_max[i] ?? 0), minTemp: Math.round(d.temperature_2m_min[i] ?? 0), precipProb, windSpeed: Math.round(d.windspeed_10m_max[i] ?? 0), icon, label };
      });
    }
  }

  if (!days.length) {
    return NextResponse.json({ error: "No weather data available" }, { status: 404 });
  }

  const avgMax = Math.round(days.reduce((s, d) => s + d.maxTemp, 0) / days.length);
  const avgMin = Math.round(days.reduce((s, d) => s + d.minTemp, 0) / days.length);
  const rainyDays = days.filter(d => d.precipProb >= 40).length;

  const iconCounts: Record<string, { count: number; label: string }> = {};
  for (const d of days) {
    if (!iconCounts[d.icon]) iconCounts[d.icon] = { count: 0, label: d.label };
    iconCounts[d.icon].count++;
  }
  const [dominantIcon, { label: dominantLabel }] = Object.entries(iconCounts).sort((a, b) => b[1].count - a[1].count)[0];

  return NextResponse.json({ mode, location, days, avgMax, avgMin, rainyDays, dominantIcon, dominantLabel });
}
