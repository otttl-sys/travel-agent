"use client";

import { useEffect, useState } from "react";
import type { SafetyData } from "@/app/api/safety-info/route";

type Level = SafetyData["aaWarning"]["level"];

const LEVEL_CONFIG: Record<
  Level,
  { icon: string; label: string; color: string; bg: string; border: string }
> = {
  none: {
    icon: "✅",
    label: "No travel warning",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800/40",
  },
  notice: {
    icon: "ℹ️",
    label: "Travel notice issued",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800/40",
  },
  partial: {
    icon: "⚠️",
    label: "Partial travel warning",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  warning: {
    icon: "🔴",
    label: "Active Reisewarnung",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800/40",
  },
  unknown: {
    icon: "🛡️",
    label: "Safety info",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
  },
};

const LEVEL_DESC: Partial<Record<Level, string>> = {
  warning:
    "Germany's Foreign Office advises against travel to this destination. Check the full advice before booking.",
  partial:
    "Partial travel warning in effect. Some regions may be unsafe — check the specific area before booking.",
  notice:
    "A travel notice is in effect. Review the current advice before your trip.",
};

export function SafetyPanel({
  destination,
  startDate,
  endDate,
}: {
  destination: string;
  startDate?: string;
  endDate?: string;
}) {
  const [data, setData] = useState<SafetyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destination) { setLoading(false); return; }
    const params = new URLSearchParams({ destination });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    fetch(`/api/safety-info?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [destination, startDate, endDate]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
          <div className="ml-auto h-3 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!data || "error" in data) return null;

  const cfg = LEVEL_CONFIG[data.aaWarning.level];
  const hasAlert = data.aaWarning.level === "warning" || data.aaWarning.level === "partial";
  const hasWeatherAlerts = data.weather.alerts.length > 0;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
        {/* AA warning */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{cfg.icon}</span>
          <div className="min-w-0">
            <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground ml-1.5">
              — {data.country}
            </span>
          </div>
          <a
            href={data.aaWarning.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-dashed whitespace-nowrap"
          >
            AA ↗
          </a>
        </div>

        {/* Weather */}
        {data.weather.available && (
          <div className="sm:ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">{data.weather.summary}</span>
          </div>
        )}
      </div>

      {/* Warning description */}
      {hasAlert && LEVEL_DESC[data.aaWarning.level] && (
        <div className="px-4 pb-3 pt-0 border-t border-inherit">
          <p className={`text-xs mt-2 ${cfg.color}`}>{LEVEL_DESC[data.aaWarning.level]}</p>
          <a
            href={data.aaWarning.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 mt-1.5 text-xs font-semibold ${cfg.color} underline underline-offset-2`}
          >
            Full advice on Auswärtiges Amt →
          </a>
        </div>
      )}

      {/* Weather alerts */}
      {hasWeatherAlerts && (
        <div className="px-4 pb-3 border-t border-inherit">
          <div className="flex items-start gap-2 mt-2">
            <span className="text-sm">⛈️</span>
            <div>
              {data.weather.alerts.map((a) => (
                <p key={a} className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {a}
                </p>
              ))}
              <p className="text-xs text-muted-foreground mt-0.5">{data.weather.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer label when no alerts */}
      {!hasAlert && !hasWeatherAlerts && data.weather.available && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">{data.weather.label}</p>
        </div>
      )}
    </div>
  );
}
