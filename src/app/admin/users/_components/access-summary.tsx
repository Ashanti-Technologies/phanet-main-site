import { ShieldCheck } from "lucide-react";
import type { AccessSummary } from "@/lib/rbac/catalog";

/** "What can they do" in plain English. */
export function AccessSummaryView({ summary }: { summary: AccessSummary }) {
  if (summary.everything) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-amber-600" />
        Everything, including managing who has admin access.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      {summary.areas.length === 0 ? (
        <p className="text-muted-foreground">No admin access.</p>
      ) : (
        <ul className="space-y-1.5">
          {summary.areas.map((a) => (
            <li key={a.area} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{a.label}:</span>
              <span className="text-muted-foreground">{a.parts.join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
      {summary.none.length > 0 && summary.areas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No access to: {summary.none.join(", ")}.
        </p>
      )}
    </div>
  );
}
