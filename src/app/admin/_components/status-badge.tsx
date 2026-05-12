import { Badge } from "@/app/components/ui/badge";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "PUBLISHED" || status === "CONFIRMED" || status === "PRAYED"
      ? "default"
      : status === "DRAFT" || status === "PENDING" || status === "NEW"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
