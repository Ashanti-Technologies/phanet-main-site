"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelRecurringGift, type RecurringGiftRow } from "@/actions/finance";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import { Button } from "@/app/components/ui/button";
import { StatusBadge, humanize } from "@/app/admin/_components/status-badge";
import { formatMoney } from "@/lib/format";

function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this monthly gift? The giver's card won't be charged again.")) return;
        startTransition(async () => {
          await cancelRecurringGift(id);
          router.refresh();
        });
      }}
    >
      {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
      Cancel
    </Button>
  );
}

const col = columnHelper<RecurringGiftRow & { canEdit: boolean }>();

const columns = col.columns([
  col.accessor((r) => r.member?.fullName ?? r.donorName, {
    id: "giver",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giver" />,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="text-sm">
          {r.member ? (
            <Link href={`/admin/members/${r.member.id}`} className="font-medium hover:underline">
              {r.member.fullName}
            </Link>
          ) : (
            <span className="font-medium">{r.donorName}</span>
          )}
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      );
    },
  }),
  col.accessor("amount", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monthly" />,
    cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.amount)}</span>,
  }),
  col.accessor((r) => r.fund.name, {
    id: "fund",
    header: "Fund",
    cell: ({ row }) => <span className="text-sm">{row.original.fund.name}</span>,
  }),
  col.accessor((r) => r.cardLabel ?? "", {
    id: "card",
    header: "Card",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.cardLabel ?? "—"}</span>,
  }),
  col.accessor("nextChargeAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Next charge" />,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.nextChargeAt
          ? new Date(row.original.nextChargeAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "—"}
      </span>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    filterFn: facetFilterFn,
    cell: ({ row }) => (
      <span title={row.original.failedAttempts ? `${row.original.failedAttempts} failed charge(s)` : undefined}>
        <StatusBadge status={row.original.status} label={humanize(row.original.status)} />
      </span>
    ),
  }),
  col.display({
    id: "actions",
    cell: ({ row }) =>
      row.original.canEdit && (row.original.status === "ACTIVE" || row.original.status === "PAUSED") ? (
        <div className="text-right">
          <CancelButton id={row.original.id} />
        </div>
      ) : null,
  }),
]);

export function MonthlyTable({ rows, canEdit }: { rows: RecurringGiftRow[]; canEdit: boolean }) {
  return (
    <DataTable
      columns={columns}
      data={rows.map((r) => ({ ...r, canEdit }))}
      searchPlaceholder="Search givers…"
      emptyMessage="No monthly gifts yet."
      filters={[
        {
          id: "status",
          title: "Status",
          options: ["ACTIVE", "PAUSED", "CANCELLED"].map((s) => ({ value: s, label: humanize(s) })),
        },
      ]}
    />
  );
}
