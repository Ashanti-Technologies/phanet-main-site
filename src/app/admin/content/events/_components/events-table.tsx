"use client";

import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
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

type EventRow = Event & { _count: { attendees: number } };

const col = columnHelper<EventRow>();

const columns = col.columns([
  col.accessor("title", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <Link
        href={`/admin/content/events/${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
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
  col.accessor((e) => e._count.attendees, {
    id: "registered",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Registered" />
    ),
    cell: ({ row }) =>
      row.original.registrationEnabled || row.original._count.attendees ? (
        <Link
          href={`/admin/content/events/${row.original.id}?tab=registrations`}
          className="tabular-nums underline-offset-4 hover:underline"
        >
          {row.original._count.attendees}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
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
      <div className="flex justify-end gap-1">
        <Button asChild variant="ghost" size="icon" title="View event">
          <Link
            href={`/admin/content/events/${row.original.id}`}
            aria-label={`View ${row.original.title}`}
          >
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" title="Edit event">
          <Link
            href={`/admin/content/events/${row.original.id}/edit`}
            aria-label={`Edit ${row.original.title}`}
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ),
  }),
]);

export function EventsTable({ events }: { events: EventRow[] }) {
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
