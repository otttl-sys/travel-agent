"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";
import type { NearbyPlace } from "@/lib/google-maps";
import type { EventItem } from "@/components/events-list";

export type ChatCard =
  | { type: "places"; items: NearbyPlace[] }
  | { type: "events"; items: EventItem[] };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
  "Was sollte ich für diese Reise einpacken?",
  "Wie wird das Wetter dort zu der Zeit?",
  "Hast du Insider-Tipps für mein Ziel?",
];

export function ConciergeChat({
  messages,
  trace,
  onSend,
  sending,
}: {
  messages: ChatMessage[];
  trace: TraceEntry[];
  onSend: (text: string) => void;
  sending: boolean;
}) {
  const [draft, setDraft] = useState("");

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Frag mich alles zu dieser Reise — ich kenne dein geplantes Programm und kann bei Bedarf
            aktuelle Infos nachschlagen.
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
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-brand text-brand-foreground rounded-br-sm"
                    : "bg-surface border border-border text-foreground rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
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

      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          placeholder="Frag den Concierge…"
          disabled={sending}
          className="min-h-10 bg-surface"
        />
        <Button size="sm" disabled={sending || !draft.trim()} onClick={() => submit(draft)}>
          {sending ? "…" : "Senden"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Unterhaltung wird beim Neuladen der Seite zurückgesetzt.</p>
    </div>
  );
}
