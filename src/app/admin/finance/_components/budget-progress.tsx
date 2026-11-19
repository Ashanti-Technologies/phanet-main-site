import type { BudgetWithActuals } from "@/actions/finance";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** One budget: scope, period and a spent-vs-budget bar. */
export function BudgetProgress({ b, actions }: { b: BudgetWithActuals; actions?: React.ReactNode }) {
  const over = b.spent > b.budget;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-medium">{b.name}</p>
          <p className="text-xs text-muted-foreground">
            {[b.category ?? "All categories", b.churchUnit ?? "Whole ministry"].join(" · ")} · {fmtDay(b.periodStart)} – {fmtDay(b.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm tabular-nums">
            <span className={cn("font-mono", over && "text-destructive")}>{formatMoney(b.spent)}</span>
            <span className="text-muted-foreground"> / {formatMoney(b.budget)}</span>
          </p>
          {actions}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={b.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.name}: ${b.pct}% spent`}>
        <div
          className={cn("h-2 rounded-full", over ? "bg-destructive" : b.pct >= 85 ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${Math.min(b.pct, 100)}%` }}
        />
      </div>
      <p className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}>
        {over ? `${formatMoney(-b.remaining)} over budget` : `${formatMoney(b.remaining)} left · ${b.pct}% spent`}
      </p>
    </div>
  );
}
