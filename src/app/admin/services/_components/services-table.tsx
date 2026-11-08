"use client";

import Link from "next/link";
import type { listServices } from "@/actions/attendance";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import {
  columnHelper,
  facetFilterFn,
} from "@/app/components/data-table/features";

export type ServiceRow = Awaited<ReturnType<typeof listServices>>[number] & {
  /** Computed on the server so render stays pure. */
  when: "upcoming" | "past";
};

const col = columnHelper<ServiceRow>();

const columns = col.columns([
  col.accessor("title", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/services/${row.original.id}/check-in`}
        className="text-sm font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  }),
  col.accessor("date", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    ),
  }),
  col.accessor("when", {
    header: "When",
    enableSorting: false,
    filterFn: facetFilterFn,
    cell: ({ row }) =>
      row.original.when === "upcoming" ? (
        <Badge variant="outline" className="text-blue-600 border-blue-500/30">
          Upcoming
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Past
        </Badge>
      ),
  }),
  col.accessor((s) => s.location ?? "", {
    id: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.location ?? "—"}
      </span>
    ),
  }),
  col.accessor((s) => s._count.attendance, {
    id: "attendance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attendance" />
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original._count.attendance}
      </span>
    ),
  }),
  col.display({
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/services/${row.original.id}/check-in`}>
            Check in
          </Link>
        </Button>
      </div>
    ),
  }),
]);

export function ServicesTable({ services }: { services: ServiceRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={services}
      searchPlaceholder="Search services…"
      emptyMessage="No services yet."
      filters={[
        {
          id: "when",
          title: "When",
          options: [
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ],
        },
      ]}
    />
  );
}
