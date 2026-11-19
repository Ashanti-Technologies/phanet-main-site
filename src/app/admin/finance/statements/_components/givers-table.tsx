"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper } from "@/app/components/data-table/features";
import { Button } from "@/app/components/ui/button";
import { formatMoney } from "@/lib/format";

export type GiverRow = {
  id: string;
  fullName: string;
  household: { id: string; name: string } | null;
  gifts: number;
  total: number;
};

const col = columnHelper<GiverRow & { year: number }>();

const columns = col.columns([
  col.accessor("fullName", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Member" />,
    enableHiding: false,
    cell: ({ row }) => (
      <Link href={`/admin/members/${row.original.id}`} className="text-sm font-medium hover:underline">
        {row.original.fullName}
      </Link>
    ),
  }),
  col.accessor((r) => r.household?.name ?? "", {
    id: "household",
    header: "Household",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.household?.name ?? "—"}</span>,
  }),
  col.accessor("gifts", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gifts" />,
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.gifts}</span>,
  }),
  col.accessor("total", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.total)}</span>,
  }),
  col.display({
    id: "download",
    cell: ({ row }) => {
      const { id, household, year } = row.original;
      const base = `/admin/finance/statements/download?year=${year}`;
      return (
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`${base}&memberId=${id}`}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Member
            </a>
          </Button>
          {household && (
            <Button asChild size="sm" variant="ghost">
              <a href={`${base}&householdId=${household.id}`}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Household
              </a>
            </Button>
          )}
        </div>
      );
    },
  }),
]);

export function GiversTable({ rows, year }: { rows: GiverRow[]; year: number }) {
  return (
    <DataTable
      columns={columns}
      data={rows.map((r) => ({ ...r, year }))}
      searchPlaceholder="Search members…"
      emptyMessage={`No gifts linked to members in ${year}.`}
    />
  );
}
