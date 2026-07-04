"use client";

import { useState, useRef, type DragEvent } from "react";

type ScanResult = {
  destination: string;
  country: string;
  region: string;
  confidence: "high" | "medium" | "low";
  interests: string[];
  tagline: string;
};

const FLAGS: Record<string, string> = {
  Australia: "🇦🇺", Austria: "🇦🇹", Argentina: "🇦🇷", Belgium: "🇧🇪", Brazil: "🇧🇷",
  Bulgaria: "🇧🇬", Cambodia: "🇰🇭", Canada: "🇨🇦", Chile: "🇨🇱", China: "🇨🇳",
  Colombia: "🇨🇴", "Costa Rica": "🇨🇷", Croatia: "🇭🇷", Cuba: "🇨🇺",
  "Czech Republic": "🇨🇿", Denmark: "🇩🇰", Ecuador: "🇪🇨", Egypt: "🇪🇬",
  Estonia: "🇪🇪", Ethiopia: "🇪🇹", Fiji: "🇫🇯", Finland: "🇫🇮", France: "🇫🇷",
  Georgia: "🇬🇪", Germany: "🇩🇪", Ghana: "🇬🇭", Greece: "🇬🇷", Guatemala: "🇬🇹",
  Hungary: "🇭🇺", Iceland: "🇮🇸", India: "🇮🇳", Indonesia: "🇮🇩",
  Ireland: "🇮🇪", Israel: "🇮🇱", Italy: "🇮🇹", Jamaica: "🇯🇲", Japan: "🇯🇵",
  Jordan: "🇯🇴", Kenya: "🇰🇪", Laos: "🇱🇦", Latvia: "🇱🇻", Lithuania: "🇱🇹",
  Madagascar: "🇲🇬", Malaysia: "🇲🇾", Maldives: "🇲🇻", Malta: "🇲🇹",
  Mauritius: "🇲🇺", Mexico: "🇲🇽", Mongolia: "🇲🇳", Montenegro: "🇲🇪",
  Morocco: "🇲🇦", Myanmar: "🇲🇲", Namibia: "🇳🇦", Nepal: "🇳🇵",
  Netherlands: "🇳🇱", "New Zealand": "🇳🇿", Nicaragua: "🇳🇮", Norway: "🇳🇴",
  Oman: "🇴🇲", Panama: "🇵🇦", Peru: "🇵🇪", Philippines: "🇵🇭", Poland: "🇵🇱",
  Portugal: "🇵🇹", Qatar: "🇶🇦", Romania: "🇷🇴", Rwanda: "🇷🇼",
  "Saudi Arabia": "🇸🇦", Seychelles: "🇸🇨", Singapore: "🇸🇬", Slovakia: "🇸🇰",
  Slovenia: "🇸🇮", "South Africa": "🇿🇦", "South Korea": "🇰🇷", Spain: "🇪🇸",
  "Sri Lanka": "🇱🇰", Sweden: "🇸🇪", Switzerland: "🇨🇭", Taiwan: "🇹🇼",
  Tanzania: "🇹🇿", Thailand: "🇹🇭", Tunisia: "🇹🇳", Turkey: "🇹🇷",
  Uganda: "🇺🇬", Ukraine: "🇺🇦", "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧", Uruguay: "🇺🇾", Uzbekistan: "🇺🇿", Vietnam: "🇻🇳",
  Zambia: "🇿🇲", Zimbabwe: "🇿🇼",
};

const CONFIDENCE_LABEL = { high: "Sehr sicher", medium: "Wahrscheinlich", low: "Unsicher" };
const CONFIDENCE_COLOR = {
  high: "text-green-600 dark:text-green-400",
  medium: "text-amber-500 dark:text-amber-400",
  low: "text-muted-foreground",
};

export function DestinationScanner({
  onConfirm,
  compact = false,
}: {
  onConfirm: (destination: string, interests: string[]) => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  async function handleFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Bild zu groß (max. 4 MB). Bitte ein kleineres Foto wählen.");
      setState("error");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setState("loading");

    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await fetch("/api/identify-destination", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Analyse fehlgeschlagen.");
        setState("error");
        return;
      }
      if (data.could_not_identify) {
        setErrorMsg(
          "Kein Reiseziel erkannt. Bitte ein Foto mit Landschaft, Architektur oder Sehenswürdigkeit wählen."
        );
        setState("error");
        return;
      }

      setResult(data as ScanResult);
      setState("result");
    } catch {
      setErrorMsg("Verbindungsfehler — bitte erneut versuchen.");
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setResult(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function confirm() {
    if (result) {
      onConfirm(result.destination, result.interests);
      reset();
    }
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const flag = result ? (FLAGS[result.country] ?? "🌍") : "";

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {state === "idle" && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 -my-1 border border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-brand text-brand bg-brand-subtle"
              : "border-transparent text-muted-foreground hover:text-foreground"
          } ${compact ? "text-xs" : "text-sm"}`}
        >
          <span className="text-base">{isDragging ? "⬇️" : "📷"}</span>
          <span className="underline underline-offset-2 decoration-dashed">
            {isDragging
              ? "Foto hier ablegen"
              : compact
                ? "Foto scannen"
                : "Oder Foto hochladen — KI erkennt das Ziel automatisch"}
          </span>
        </div>
      )}

      {state === "loading" && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
          {preview && (
            <img src={preview} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block animate-spin">⏳</span>
            KI analysiert das Foto…
          </div>
        </div>
      )}

      {state === "result" && result && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="flex gap-3 p-3">
            {preview && (
              <img
                src={preview}
                alt={result.destination}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-lg leading-none">{flag}</span>
                <span className="font-bold text-foreground text-base">{result.destination}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {result.region} · {result.country}
              </p>
              {result.tagline && (
                <p className="text-xs text-muted-foreground italic mb-2">
                  &ldquo;{result.tagline}&rdquo;
                </p>
              )}
              <span className={`text-xs font-semibold ${CONFIDENCE_COLOR[result.confidence]}`}>
                {CONFIDENCE_LABEL[result.confidence]}
              </span>
              {result.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.interests.map((i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-brand-subtle text-brand font-medium capitalize"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex border-t border-border">
            <button
              type="button"
              onClick={confirm}
              className="flex-1 py-2.5 text-sm font-semibold text-background bg-foreground hover:bg-brand hover:text-brand-foreground transition-colors"
            >
              Ja, dieses Ziel →
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground border-l border-border transition-colors"
            >
              × Anderes
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="p-3 rounded-xl border border-border bg-surface">
          <p className="text-sm text-muted-foreground mb-2">{errorMsg}</p>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-brand hover:text-brand/80 font-medium"
          >
            ← Zurück
          </button>
        </div>
      )}
    </div>
  );
}
