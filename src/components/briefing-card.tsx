export type BriefingSection = {
  icon: string;
  title: string;
  body: string;
};

export function BriefingCard({ sections }: { sections: BriefingSection[] }) {
  if (sections.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {sections.map((s, i) => (
        <div key={i} className={i === 0 ? "pb-4" : "py-4"}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base leading-none">{s.icon}</span>
            <p className="text-sm font-semibold text-foreground">{s.title}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
