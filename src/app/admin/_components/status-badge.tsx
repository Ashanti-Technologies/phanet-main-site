import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";

// One status vocabulary for the whole admin: five tones, outline badges.
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-cerulean dark:text-sky-300",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-destructive",
};

// Enum values are unique enough across models to share one map.
const STATUS_TONE: Record<string, Tone> = {
  // Publishing
  PUBLISHED: "success",
  // Members
  VISITOR: "info",
  PENDING_APPROVAL: "warning",
  REGULAR: "success",
  MEMBER: "success",
  // Prayer requests
  NEW: "info",
  IN_PRAYER: "warning",
  PRAYED: "success",
  // Fundraising
  ACTIVE: "success",
  FULFILLED: "info",
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "danger",
  // Finance
  APPROVED: "info",
  PAID: "success",
  REJECTED: "danger",
  VOIDED: "danger",
  PAUSED: "warning",
  // Messaging
  SENDING: "info",
  SENT: "success",
  DELIVERED: "success",
  PARTIAL: "warning",
  BOUNCED: "warning",
  FAILED: "danger",
};

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? "neutral";
}

export function humanize(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const t = tone ?? statusTone(status);
  return (
    <Badge
      variant="outline"
      className={cn(TONE_TEXT[t], "border-current/30", className)}
    >
      {label ?? humanize(status)}
    </Badge>
  );
}
