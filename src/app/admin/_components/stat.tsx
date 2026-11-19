import { cn } from "@/lib/utils";
import { TONE_TEXT, type Tone } from "./status-badge";

// The one stat tile for the admin. Label above, mono tabular value below.
export function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          tone && TONE_TEXT[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}
