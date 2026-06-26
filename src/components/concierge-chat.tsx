"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";
import { ImagePlus, X } from "lucide-react";
import type { NearbyPlace } from "@/lib/google-maps";
import type { EventItem } from "@/components/events-list";

export type ChatCard =
  | { type: "places"; items: NearbyPlace[] }
  | { type: "events"; items: EventItem[] };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  cards?: ChatCard[];
};

function PlacesCard({ items }: { items: NearbyPlace[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {items.map((place, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-surface border border-border px-3 py-2.5">
          <span className="text-base leading-tight mt-0.5 shrink-0">{place.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
            <p className="text-xs text-muted-foreground truncate">{place.address}</p>
            {place.rating && <p className="text-xs text-amber-500">★ {place.rating}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsCard({ items }: { items: EventItem[] }) {
  return (
    <div className="space-y-2 mt-2">
      {items.map((e, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-surface border border-border px-3 py-2.5">
          <span className="text-base leading-tight mt-0.5 shrink-0">{e.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
            <p className="text-xs text-muted-foreground">{e.dates}{e.venue ? ` · ${e.venue}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const STARTER_QUESTIONS = [
  "What should I pack for this trip?",
  "How will the weather be there?",
  "Any insider tips for my destination?",
];

export function ConciergeChat({
  messages,
  trace,
  onSend,
  sending,
}: {
  messages: ChatMessage[];
  trace: TraceEntry[];
  onSend: (text: string, imageUrl?: string) => void;
  sending: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || sending) return;
    onSend(trimmed || "What can you tell me about this image?", pendingImage ?? undefined);
    setDraft("");
    setPendingImage(null);
  }

  function loadImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) loadImageFile(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImageFile(file);
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ask me anything about this trip — I know your planned itinerary and can look up current info when needed.
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                disabled={sending}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.imageUrl && (
                <div className={`max-w-[85%] mb-1 ${m.role === "user" ? "self-end" : "self-start"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.imageUrl}
                    alt="Attached image"
                    className="rounded-xl max-h-48 object-cover border border-border"
                  />
                </div>
              )}
              {m.content && (
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-brand text-brand-foreground rounded-br-sm"
                      : "bg-surface border border-border text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              )}
              {m.cards?.map((card, ci) => (
                <div key={ci} className="max-w-[85%] w-full">
                  {card.type === "places" && <PlacesCard items={card.items} />}
                  {card.type === "events" && <EventsCard items={card.items} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {trace.length > 0 && (
        <div className="rounded-lg bg-surface border border-border p-3">
          <AgentTrace trace={trace} />
        </div>
      )}

      {/* Image preview */}
      {pendingImage && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage} alt="Preview" className="h-24 rounded-xl border border-border object-cover" />
          <button
            onClick={() => setPendingImage(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div
        className={`flex items-end gap-2 rounded-xl transition-colors ${isDragOver ? "ring-2 ring-brand/40 bg-brand-subtle/30" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f); e.target.value = ""; }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="shrink-0 w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
          title="Attach image"
        >
          <ImagePlus size={14} strokeWidth={1.5} />
        </button>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          onPaste={handlePaste}
          placeholder={isDragOver ? "Drop image here…" : "Ask your concierge… (paste or drag images)"}
          disabled={sending}
          className="min-h-10 bg-surface"
        />
        <Button size="sm" disabled={sending || (!draft.trim() && !pendingImage)} onClick={() => submit(draft)}>
          {sending ? "…" : "Send"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">You can paste or drag in screenshots, e.g. from Google Maps.</p>
    </div>
  );
}
