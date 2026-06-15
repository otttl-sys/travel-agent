export type EventItem = {
  icon: string;
  name: string;
  dates: string;
  category: string;
  description: string;
  venue?: string;
  lat?: number;
  lng?: number;
};

export function EventsList({ events }: { events: EventItem[] }) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none shrink-0 mt-0.5">{e.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{e.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 mb-2">
                <span className="text-xs font-medium text-brand bg-brand-subtle rounded-full px-2 py-0.5">
                  {e.dates}
                </span>
                <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {e.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
