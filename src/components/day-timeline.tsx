export type DaySchedule = {
  day: string;
  blocks: { time: string; activity: string; note?: string }[];
};

export function DayTimeline({ days }: { days: DaySchedule[] }) {
  if (days.length === 0) return null;

  return (
    <div className="space-y-6">
      {days.map((d, di) => (
        <div key={di}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{d.day}</p>
          <div className="space-y-0">
            {d.blocks.map((b, bi) => (
              <div key={bi} className="flex gap-3">
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-xs font-medium text-gray-500 pt-0.5">{b.time}</span>
                  {bi < d.blocks.length - 1 && <span className="flex-1 w-px bg-gray-200 mt-1.5" />}
                </div>
                <div className={`min-w-0 flex-1 ${bi < d.blocks.length - 1 ? "pb-4" : ""}`}>
                  <p className="text-sm font-medium text-gray-800">{b.activity}</p>
                  {b.note && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
