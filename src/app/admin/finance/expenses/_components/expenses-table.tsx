"use client";

import Link from "next/link";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import { StatusBadge, humanize } from "@/app/admin/_components/status-badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExpenseStatusKey } from "@/lib/schemas/finance.schema";

// Shape after serializePrisma (Decimal → number, Date → ISO string).
export type ExpenseRow = {
  id: string;
  amount: number;
  incurredAt: string;
  payee: string;
  description: string;
  status: ExpenseStatusKey;
  voidedAt: string | null;
  category: { name: string };
  fund: { name: string } | null;
  churchUnit: { name: string } | null;
};

const col = columnHelper<ExpenseRow>();

const columns = col.columns([
  col.accessor("incurredAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {new Date(row.original.incurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    ),
  }),
  col.accessor("payee", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Paid to" />,
    cell: ({ row }) => (
      <Link href={`/admin/finance/expenses/${row.original.id}`} className="text-sm font-medium hover:underline">
        {row.original.payee}
        <p className="line-clamp-1 max-w-64 text-xs font-normal text-muted-foreground">{row.original.description}</p>
      </Link>
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
  col.accessor((r) => r.category.name, {
    id: "category",
    header: "Category",
    filterFn: facetFilterFn,
    cell: ({ row }) => <span className="text-sm">{row.original.category.name}</span>,
  }),
  col.accessor((r) => r.churchUnit?.name ?? r.fund?.name ?? "", {
    id: "unit",
    header: "Unit / fund",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {[row.original.churchUnit?.name, row.original.fund?.name].filter(Boolean).join(" · ") || "—"}
      </span>
    ),
  }),
  col.accessor((r) => (r.voidedAt ? "VOIDED" : r.status), {
    id: "status",
    header: "Status",
    filterFn: facetFilterFn,
    cell: ({ getValue }) => {
      const s = getValue();
      return <StatusBadge status={s} label={humanize(s)} />;
    },
  }),
]);

export function ExpensesTable({ rows, categories }: { rows: ExpenseRow[]; categories: string[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search payee…"
      emptyMessage="No expenses in this period."
      filters={[
        {
          id: "status",
          title: "Status",
          options: ["PENDING", "APPROVED", "PAID", "REJECTED", "VOIDED"].map((s) => ({ value: s, label: humanize(s) })),
        },
        { id: "category", title: "Category", options: categories.map((c) => ({ value: c, label: c })) },
      ]}
    />
  );
}
