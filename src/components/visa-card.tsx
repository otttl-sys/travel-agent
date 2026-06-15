export type VisaRequirement = {
  icon: string;
  category: string;
  status: "required" | "not-required" | "check" | "info";
  title: string;
  details: string;
};

export type EVisaAction = {
  label: string;
  url: string;
  price?: string;
};

const STATUS_META: Record<VisaRequirement["status"], { label: string; className: string }> = {
  required: { label: "Required", className: "text-red-600 bg-red-50" },
  "not-required": { label: "Not Required", className: "text-green-600 bg-green-50" },
  check: { label: "Verify", className: "text-amber-600 bg-amber-50" },
  info: { label: "Info", className: "text-blue-600 bg-blue-50" },
};

export function VisaCard({
  requirements,
  disclaimer,
  passport,
  eVisaActions = [],
}: {
  requirements: VisaRequirement[];
  disclaimer: string;
  passport: string;
  eVisaActions?: EVisaAction[];
}) {
  const grouped = requirements.reduce<Record<string, VisaRequirement[]>>((acc, req) => {
    (acc[req.category] ??= []).push(req);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Requirements for{" "}
        <span className="font-medium text-foreground">{passport}</span> passport holders
      </p>

      {Object.entries(grouped).map(([category, reqs]) => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {category}
          </p>
          <div className="space-y-2">
            {reqs.map((req, i) => {
              const meta = STATUS_META[req.status] ?? STATUS_META.info;
              return (
                <div key={i} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none shrink-0 mt-0.5">{req.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <p className="text-sm font-semibold text-foreground">{req.title}</p>
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{req.details}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {eVisaActions.length > 0 && (
        <div className="rounded-lg border border-brand-subtle bg-brand-subtle px-4 py-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">
            Apply Online
          </p>
          {eVisaActions.map((action, i) => (
            <a
              key={i}
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-brand/90 transition-colors"
            >
              {action.label}
              {action.price && (
                <span className="opacity-75 text-xs">· {action.price}</span>
              )}
            </a>
          ))}
        </div>
      )}

      {disclaimer && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed">⚠️ {disclaimer}</p>
        </div>
      )}
    </div>
  );
}
