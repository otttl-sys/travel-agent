"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";

type DisplayMessage = { role: "user" | "assistant"; content: string };
type ApiMessage = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "I want a beach holiday in August ☀️",
  "Surprise me with somewhere exotic 🌍",
  "Family trip with kids, budget-friendly 👨‍👩‍👧",
  "Solo adventure, off the beaten path ⚡",
];

const INITIAL_MESSAGE =
  "Hi! Tell me where you're dreaming of going — or describe the kind of trip you have in mind and I'll help plan it.";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [display, setDisplay] = useState<DisplayMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [display, isLoading]);

  // Auto-send if pre-filled from homepage
  useEffect(() => {
    if (initialQuery) {
      send(initialQuery);
      setInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if (!text.trim() || isLoading || transitioning) return;

    const userMsg: ApiMessage = { role: "user", content: text };
    const nextApiMessages = [...apiMessages, userMsg];

    setDisplay((prev) => [...prev, { role: "user", content: text }]);
    setApiMessages(nextApiMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextApiMessages }),
      });
      const data = await res.json();

      // Check for plan_trip tool call
      const toolUse = (data.content as Array<{ type: string; name?: string; input?: Record<string, unknown> }>)
        .find((b) => b.type === "tool_use" && b.name === "plan_trip");

      if (toolUse) {
        const params = toolUse.input as {
          destination: string;
          origin?: string;
          budget?: number;
          startDate?: string;
          endDate?: string;
          travelers?: number;
          interests?: string[];
          multiCity?: boolean;
          cities?: string[];
        };

        const confirmMsg = `Perfect! Let me plan your trip to ${params.destination} now — 8 agents are on it.`;
        setDisplay((prev) => [...prev, { role: "assistant", content: confirmMsg }]);
        setTransitioning(true);

        const qs = new URLSearchParams();
        qs.set("destination", params.destination);
        qs.set("travelers", String(params.travelers ?? 2));
        if (params.budget) qs.set("budget", String(params.budget));
        if (params.startDate) qs.set("startDate", params.startDate);
        if (params.endDate) qs.set("endDate", params.endDate);
        if (params.interests?.length) qs.set("interests", params.interests.join(","));
        if (params.origin) qs.set("origin", params.origin);
        if (params.multiCity && params.cities?.length) {
          qs.set("multiCity", "1");
          qs.set("cities", params.cities.join(","));
        }

        setTimeout(() => router.push(`/results?${qs.toString()}`), 1400);
        return;
      }

      // Regular text reply
      const textBlock = (data.content as Array<{ type: string; text?: string }>)
        .find((b) => b.type === "text");
      const reply = textBlock?.text ?? "Could you tell me more?";

      setDisplay((prev) => [...prev, { role: "assistant", content: reply }]);
      setApiMessages([...nextApiMessages, { role: "assistant", content: reply }]);
    } catch {
      setDisplay((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong — please try again." },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const showStarters = display.length === 1 && !isLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link
          href="/plan"
          className="text-xs text-muted-foreground hidden sm:block hover:text-foreground transition-colors mr-2 uppercase tracking-[0.15em]"
        >
          Use wizard →
        </Link>
      </SiteNav>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pt-8 pb-6">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
            AI Travel Assistant
          </p>
          <h1 className="text-3xl font-heading font-extrabold tracking-[-0.03em] text-foreground">
            Where to next?
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-6 min-h-0">
          {display.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-base shrink-0 mt-0.5 select-none">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-foreground text-background rounded-tr-sm"
                    : "bg-surface border border-border text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && !transitioning && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-base shrink-0">
                🤖
              </div>
              <div className="bg-surface border border-border px-4 py-3.5 rounded-2xl rounded-tl-sm">
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {/* Planning transition */}
          {transitioning && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="text-5xl mb-3 animate-pulse">🗺️</div>
                <p className="text-sm font-semibold text-foreground">Planning your trip…</p>
                <p className="text-xs text-muted-foreground mt-1">8 AI agents are on it</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Starter chips */}
        {showStarters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-xs px-3.5 py-2 rounded-full border border-border bg-surface hover:bg-brand-subtle hover:border-brand/30 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {!transitioning && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(input);
              }}
              placeholder="Describe your dream trip…"
              disabled={isLoading}
              autoFocus={!initialQuery}
              className="flex-1 text-sm rounded-xl border border-border bg-surface px-4 py-3 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            />
            <Button
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="px-5 shrink-0"
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              ) : (
                "→"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
