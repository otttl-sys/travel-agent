export type BudgetLine = {
  category: string;
  icon: string;
  amountPerPerson: number;
  amountTotal: number;
  notes: string;
};

export type BudgetEstimate = {
  lines: BudgetLine[];
  totalPerPerson: number;
  totalAll: number;
  verdict: "comfortable" | "tight" | "over-budget";
  verdictNote: string;
};

const VERDICT_META: Record<BudgetEstimate["verdict"], { label: string; className: string; barColor: string }> = {
  comfortable: { label: "Within budget", className: "text-green-700 bg-green-50 border-green-100", barColor: "bg-green-500" },
  tight: { label: "Tight", className: "text-amber-700 bg-amber-50 border-amber-100", barColor: "bg-amber-400" },
  "over-budget": { label: "Over budget", className: "text-red-700 bg-red-50 border-red-100", barColor: "bg-red-500" },
};

function fmt(n: number) {
  return `€${Math.round(n).toLocaleString("de-DE")}`;
}

export function BudgetBreakdown({
  estimate,
  userBudget,
  travelers,
}: {
  estimate: BudgetEstimate;
  userBudget: number;
  travelers: number;
}) {
  const meta = VERDICT_META[estimate.verdict] ?? VERDICT_META.tight;
  const budgetBar = Math.min(100, Math.round((estimate.totalPerPerson / Math.max(userBudget, 1)) * 100));

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div className={`rounded-lg border px-4 py-3 ${meta.className}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="text-sm font-mono">{fmt(estimate.totalPerPerson)} / person</span>
        </div>
        <p className="text-xs leading-relaxed">{estimate.verdictNote}</p>
        {userBudget > 0 && (
          <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${meta.barColor}`}
              style={{ width: `${budgetBar}%` }}
            />
          </div>
        )}
        {userBudget > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-xs opacity-60">€0</span>
            <span className="text-xs opacity-60">Your budget: {fmt(userBudget)}</span>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {estimate.lines.map((line, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 ${i < estimate.lines.length - 1 ? "border-b border-border" : ""}`}
          >
            <span className="text-lg shrink-0 mt-0.5">{line.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{line.category}</span>
                <span className="text-sm font-mono text-foreground shrink-0">{fmt(line.amountPerPerson)}<span className="text-xs text-muted-foreground font-sans"> /p</span></span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{line.notes}</p>
            </div>
          </div>
        ))}

        {/* Total row */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-t border-border">
          <div>
            <span className="text-sm font-semibold text-foreground">Total</span>
            {travelers > 1 && (
              <span className="text-xs text-muted-foreground ml-2">{travelers} travelers</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold font-mono text-foreground">{fmt(estimate.totalPerPerson)}<span className="text-xs text-muted-foreground font-sans"> /person</span></div>
            {travelers > 1 && (
              <div className="text-xs text-muted-foreground font-mono">{fmt(estimate.totalAll)} total</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
