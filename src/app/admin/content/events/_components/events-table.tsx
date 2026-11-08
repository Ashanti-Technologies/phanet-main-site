"use client";

import Link from "next/link";
import type { Event } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import {
  columnHelper,
  facetFilterFn,
} from "@/app/components/data-table/features";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import {
  CATEGORY_LABELS,
  formatEventDate,
  type EventCategory,
} from "@/lib/events";

const col = columnHelper<Event>();

const columns = col.columns([
  col.accessor("title", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    enableHiding: false,
  }),
  col.accessor("date", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) =>
      formatEventDate(
        row.original.date.toISOString(),
        row.original.endDate?.toISOString(),
      ),
  }),
  col.accessor("category", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) =>
      CATEGORY_LABELS[row.original.category as EventCategory] ??
      row.original.category,
    filterFn: facetFilterFn,
  }),
  col.accessor("location", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
  }),
  col.accessor("status", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: facetFilterFn,
  }),
  col.display({
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/content/events/${row.original.id}`}>Edit</Link>
        </Button>
      </div>
    ),
  }),
]);

export function EventsTable({ events }: { events: Event[] }) {
  return (
    <DataTable
      columns={columns}
      data={events}
      searchPlaceholder="Search events…"
      emptyMessage="No events yet."
      filters={[
        {
          id: "status",
          title: "Status",
          options: [
            { value: "PUBLISHED", label: "Published" },
            { value: "DRAFT", label: "Draft" },
          ],
        },
        {
          id: "category",
          title: "Category",
          options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
      ]}
    />
  );
}
