"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentTrace, type TraceEntry } from "@/components/agent-trace";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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
          <p className="text-sm text-gray-500">
            Frag mich alles zu dieser Reise — ich kenne dein geplantes Programm und kann bei Bedarf
            aktuelle Infos nachschlagen.
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                disabled={sending}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
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
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {trace.length > 0 && (
        <div className="rounded-lg bg-white border border-gray-100 p-3">
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
          className="min-h-10 bg-white"
        />
        <Button size="sm" disabled={sending || !draft.trim()} onClick={() => submit(draft)}>
          {sending ? "…" : "Senden"}
        </Button>
      </div>
      <p className="text-xs text-gray-400">Unterhaltung wird beim Neuladen der Seite zurückgesetzt.</p>
    </div>
  );
}
