"use client";

import Link from "next/link";
import type { ContentPage } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import {
  columnHelper,
  facetFilterFn,
} from "@/app/components/data-table/features";
import { StatusBadge } from "@/app/admin/_components/status-badge";

const col = columnHelper<ContentPage>();

const columns = col.columns([
  col.accessor("title", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    enableHiding: false,
  }),
  col.accessor("slug", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
    cell: ({ row }) => `/${row.original.slug}`,
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
          <Link href={`/admin/content/pages/${row.original.id}`}>Edit</Link>
        </Button>
      </div>
    ),
  }),
]);

export function PagesTable({ pages }: { pages: ContentPage[] }) {
  return (
    <DataTable
      columns={columns}
      data={pages}
      searchPlaceholder="Search pages…"
      emptyMessage="No pages yet."
      filters={[
        {
          id: "status",
          title: "Status",
          options: [
            { value: "PUBLISHED", label: "Published" },
            { value: "DRAFT", label: "Draft" },
          ],
        },
      ]}
    />
  );
}
