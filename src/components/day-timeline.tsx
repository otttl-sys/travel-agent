"use client";

import { useRef, useState, useEffect } from "react";

export type DaySchedule = {
  day: string;
  blocks: { time: string; activity: string; note?: string; lat?: number; lng?: number }[];
};

function shortLabel(day: string) {
  return day.match(/Day\s*\d+/i)?.[0] ?? day.split(/[–—\-:]/)[0].trim();
}

export function DayTimeline({ days }: { days: DaySchedule[] }) {
  if (days.length === 0) return null;

  const [activeDay, setActiveDay] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  function scrollToDay(i: number) {
    const el = cardRefs.current[i];
    if (!el || !scrollRef.current) return;
    scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
    setActiveDay(i);
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.findIndex(el => el === entry.target);
            if (idx !== -1) setActiveDay(idx);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [days]);

  return (
    <div>
      {days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [&::-webkit-scrollbar]:hidden">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => scrollToDay(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                i === activeDay
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {shortLabel(d.day)}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
      >
        {days.map((d, di) => (
          <div
            key={di}
            ref={el => { cardRefs.current[di] = el; }}
            className="w-full shrink-0 snap-start"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{d.day}</p>
            <div>
              {d.blocks.map((b, bi) => (
                <div key={bi} className="flex gap-3">
                  <div className="flex flex-col items-center w-14 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground pt-0.5">{b.time}</span>
                    {bi < d.blocks.length - 1 && <span className="flex-1 w-px bg-border mt-1.5" />}
                  </div>
                  <div className={`min-w-0 flex-1 ${bi < d.blocks.length - 1 ? "pb-4" : ""}`}>
                    <p className="text-sm font-medium text-foreground">{b.activity}</p>
                    {b.note && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {days.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {days.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToDay(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === activeDay ? "bg-foreground" : "bg-foreground/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
