"use client";

import { Badge } from "@/app/components/ui/badge";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper } from "@/app/components/data-table/features";
import { CommitmentFinanceForm } from "./commitment-finance-form";

// Shape after serializePrisma (Decimal → number, Date → ISO string).
export type CommitmentRow = {
  id: string;
  fullName: string;
  isAnonymous: boolean;
  email: string;
  country: string;
  churchUnit: string | null;
  amountCommitted: number;
  confirmedAmount: number | null;
  confirmedAt: string | null;
  paymentNote: string | null;
  internalNote: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
};

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const col = columnHelper<CommitmentRow>();

// Server-side table: only name, amount and date sort (see getCommitmentsByProject).
const columns = col.columns([
  col.accessor("fullName", {
    id: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.fullName}
        {row.original.isAnonymous && (
          <span className="ml-2 text-xs text-muted-foreground">(Anonymous)</span>
        )}
      </span>
    ),
  }),
  col.accessor("email", { header: "Email", enableSorting: false }),
  col.accessor("country", { header: "Country", enableSorting: false }),
  col.accessor((c) => c.churchUnit ?? "", {
    id: "churchUnit",
    header: "Church Unit",
    enableSorting: false,
    cell: ({ row }) => row.original.churchUnit || "-",
  }),
  col.accessor("amountCommitted", {
    id: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" className="justify-end" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        GH₵ {row.original.amountCommitted.toLocaleString()}
      </div>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  }),
  col.display({
    id: "finance",
    header: "Finance",
    cell: ({ row }) => <CommitmentFinanceForm commitment={row.original} />,
  }),
  col.accessor("createdAt", {
    id: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  }),
]);

export function CommitmentsTable({
  commitments,
  total,
}: {
  commitments: CommitmentRow[];
  total: number;
}) {
  return (
    <DataTable
      columns={columns}
      data={commitments}
      rowCount={total}
      searchPlaceholder="Search name or email…"
      emptyMessage="No commitments yet for this project."
      filters={[
        {
          id: "status",
          title: "Status",
          options: [
            { value: "PENDING", label: "Pending" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
        },
      ]}
    />
  );
}
