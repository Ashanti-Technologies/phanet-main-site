"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import { relTime } from "@/lib/format";
import type { DraftRow } from "@/lib/registration-drafts";
import { DiscardDraftButton, RemindButton } from "./draft-actions";

const col = columnHelper<DraftRow>();

/** Started-but-unfinished registrations. Contact fields arrive blank without members.contact. */
export function DraftsTable({
  eventId,
  drafts,
  canManage,
  showContact,
}: {
  eventId: string;
  drafts: DraftRow[];
  canManage: boolean;
  showContact: boolean;
}) {
  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
          enableHiding: false,
        }),
        ...(showContact
          ? [
              col.accessor((d) => [d.email, d.phone].filter(Boolean).join(" · "), {
                id: "contact",
                header: "Contact",
                cell: ({ row }) => (
                  <div className="text-sm">
                    <p>{row.original.phone || "—"}</p>
                    <p className="text-xs text-muted-foreground">{row.original.email}</p>
                  </div>
                ),
                enableSorting: false,
              }),
            ]
          : []),
        col.accessor("stepLabel", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Reached" />,
          filterFn: facetFilterFn,
        }),
        col.accessor("people", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="People" />,
          cell: ({ getValue }) => <span className="font-mono tabular-nums">{getValue() || "—"}</span>,
        }),
        col.accessor((d) => new Date(d.lastActiveAt).getTime(), {
          id: "lastActiveAt",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Last active" />,
          cell: ({ row }) => relTime(row.original.lastActiveAt),
        }),
        col.accessor("remindersSent", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Reminded" />,
          cell: ({ row }) =>
            row.original.remindersSent ? (
              <span>
                {row.original.remindersSent}×{" "}
                <span className="text-xs text-muted-foreground">
                  (last {relTime(row.original.lastRemindedAt!)})
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        }),
        ...(canManage
          ? [
              col.display({
                id: "actions",
                header: () => <span className="sr-only">Actions</span>,
                cell: ({ row }) => (
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/content/events/${eventId}/register/${row.original.userId}`}>Open</Link>
                    </Button>
                    <RemindButton draftId={row.original.id} disabled={!row.original.canRemind} />
                    <DiscardDraftButton draftId={row.original.id} name={row.original.name} />
                  </div>
                ),
                enableSorting: false,
                enableHiding: false,
              }),
            ]
          : []),
      ]),
    [eventId, canManage, showContact],
  );

  return (
    <DataTable
      columns={columns}
      data={drafts}
      searchPlaceholder="Search names…"
      emptyMessage="No one is part-way through the form."
      filters={[
        {
          id: "stepLabel",
          title: "Reached",
          options: [...new Set(drafts.map((d) => d.stepLabel))].map((l) => ({ value: l, label: l })),
        },
      ]}
    />
  );
}
