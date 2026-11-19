"use client";

import Link from "next/link";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { METHOD_LABELS, METHOD_OPTIONS } from "../../_components/labels";
import { VoidButton } from "../../_components/void-button";

// Shape after serializePrisma (Decimal → number, Date → ISO string).
export type IncomeRow = {
  id: string;
  amount: number;
  receivedAt: string;
  method: keyof typeof METHOD_LABELS;
  reference: string | null;
  donorName: string | null;
  note: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  fund: { name: string };
  member: { id: string; fullName: string } | null;
  service: { title: string } | null;
  commitment: { project: { id: string; title: string } } | null;
  recordedBy: { name: string } | null;
};

const col = columnHelper<IncomeRow>();

const baseColumns = col.columns([
  col.accessor("receivedAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {new Date(row.original.receivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    ),
  }),
  col.accessor("amount", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className={cn("font-mono text-sm tabular-nums", row.original.voidedAt && "line-through text-muted-foreground")}>
        {formatMoney(row.original.amount)}
      </span>
    ),
  }),
  col.accessor((r) => r.fund.name, {
    id: "fund",
    header: "Fund",
    filterFn: facetFilterFn,
    cell: ({ row }) => <span className="text-sm">{row.original.fund.name}</span>,
  }),
  col.accessor("method", {
    header: "Method",
    filterFn: facetFilterFn,
    cell: ({ row }) => <span className="text-sm">{METHOD_LABELS[row.original.method]}</span>,
  }),
  col.accessor((r) => r.member?.fullName ?? r.donorName ?? "", {
    id: "from",
    header: "From",
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="text-sm">
          {r.member ? (
            <Link href={`/admin/members/${r.member.id}`} className="font-medium hover:underline">
              {r.member.fullName}
            </Link>
          ) : (
            <span>{r.donorName ?? "Anonymous"}</span>
          )}
          {r.commitment && (
            <p className="text-xs text-muted-foreground">Pledge · {r.commitment.project.title}</p>
          )}
        </div>
      );
    },
  }),
  col.accessor((r) => r.reference ?? "", {
    id: "reference",
    header: "Reference",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reference ?? "—"}</span>,
  }),
  col.accessor((r) => (r.voidedAt ? "voided" : "active"), {
    id: "status",
    header: "Status",
    filterFn: facetFilterFn,
    cell: ({ row }) =>
      row.original.voidedAt ? (
        <span title={row.original.voidReason ?? undefined}>
          <StatusBadge status="VOIDED" label="Voided" />
        </span>
      ) : (
        <StatusBadge status="PAID" label="Received" />
      ),
  }),
  col.accessor((r) => r.recordedBy?.name ?? "Online", {
    id: "recordedBy",
    header: "Recorded by",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.recordedBy?.name ?? "Online"}</span>,
  }),
]);

const columns = [
  ...baseColumns,
  ...col.columns([
    col.display({
      id: "actions",
      cell: ({ row }) =>
        row.original.voidedAt ? null : (
          <div className="text-right">
            <VoidButton id={row.original.id} kind="income" size="icon" />
          </div>
        ),
    }),
  ]),
];

export function IncomeTable({ rows, funds, canEdit }: { rows: IncomeRow[]; funds: string[]; canEdit: boolean }) {
  return (
    <DataTable
      columns={canEdit ? columns : baseColumns}
      data={rows}
      searchPlaceholder="Search name, reference…"
      emptyMessage="No income recorded in this period."
      filters={[
        { id: "fund", title: "Fund", options: funds.map((f) => ({ value: f, label: f })) },
        { id: "method", title: "Method", options: METHOD_OPTIONS },
        {
          id: "status",
          title: "Status",
          options: [
            { value: "active", label: "Received" },
            { value: "voided", label: "Voided" },
          ],
        },
      ]}
    />
  );
}
