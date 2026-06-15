export type WeatherDay = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipProb: number;
  windSpeed: number;
  icon: string;
  label: string;
};

export type WeatherResult = {
  mode: "forecast" | "historical";
  location: string;
  days: WeatherDay[];
  avgMax: number;
  avgMin: number;
  rainyDays: number;
  dominantIcon: string;
  dominantLabel: string;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function uvLabel(uv: number): string {
  if (uv >= 8) return "Very high";
  if (uv >= 6) return "High";
  if (uv >= 3) return "Moderate";
  return "Low";
}

export function WeatherForecast({ result }: { result: WeatherResult }) {
  const { mode, location, days, avgMax, avgMin, rainyDays, dominantIcon, dominantLabel } = result;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-4xl leading-none">{dominantIcon}</span>
          <div>
            <p className="font-semibold text-foreground text-sm">{location}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dominantLabel} · {avgMin}–{avgMax}°C avg
              {rainyDays > 0 && <span className="text-blue-500"> · {rainyDays} rainy {rainyDays === 1 ? "day" : "days"}</span>}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
          mode === "forecast"
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {mode === "forecast" ? "✓ Live forecast" : "📅 Historical avg"}
        </span>
      </div>

      {/* Day strip */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ minWidth: "max-content" }}>
          {days.map((day) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 rounded-xl bg-surface border border-border px-3 py-3 min-w-[76px] hover:border-brand transition-colors"
            >
              <p className="text-[11px] text-muted-foreground whitespace-nowrap leading-tight text-center">{shortDate(day.date)}</p>
              <span className="text-2xl leading-none mt-0.5">{day.icon}</span>
              <p className="text-sm font-semibold text-foreground leading-tight">{day.maxTemp}°</p>
              <p className="text-xs text-muted-foreground leading-tight">{day.minTemp}°</p>
              {day.precipProb >= 20 ? (
                <p className="text-[11px] text-blue-500 leading-tight">💧 {day.precipProb}%</p>
              ) : (
                <p className="text-[11px] text-muted-foreground/50 leading-tight">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {mode === "historical" && (
        <p className="text-xs text-muted-foreground text-center">
          Based on the same period last year — live forecast not yet available.
        </p>
      )}
    </div>
  );
}
