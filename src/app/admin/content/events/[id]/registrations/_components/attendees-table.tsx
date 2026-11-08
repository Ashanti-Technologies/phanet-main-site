"use client";

import { useOptimistic, useTransition } from "react";
import { setAttendeeCheckIn } from "@/actions/event-registrations";
import { Checkbox } from "@/app/components/ui/checkbox";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import type { AttendeeRow } from "@/lib/event-registration";

type Row = AttendeeRow & { checkedInLabel: string };

const col = columnHelper<Row>();

function CheckInCell({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(row.checkedIn);
  return (
    <Checkbox
      aria-label={`Checked in: ${row.name}`}
      checked={checked}
      disabled={isPending}
      onCheckedChange={(v) =>
        startTransition(async () => {
          setChecked(v === true);
          await setAttendeeCheckIn(row.id, v === true);
        })
      }
    />
  );
}

const baseColumns = [
  // Filterable by "Checked in" / "Not yet"; renders as a checkbox.
  col.accessor("checkedInLabel", {
    header: "In",
    cell: ({ row }) => <CheckInCell row={row.original} />,
    filterFn: facetFilterFn,
    enableSorting: false,
  }),
  col.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.relationship === "Registrant"
            ? row.original.bookedByContact
            : `${row.original.relationship} · booked by ${row.original.bookedBy}`}
        </p>
      </div>
    ),
    enableHiding: false,
  }),
  col.accessor("ageGroup", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
    filterFn: facetFilterFn,
  }),
  col.accessor("food", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Food" />,
    filterFn: facetFilterFn,
  }),
  col.accessor("allergies", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Allergies" />,
    cell: ({ row }) =>
      row.original.allergies ? (
        <span className="text-destructive">{row.original.allergies}</span>
      ) : null,
  }),
  col.accessor("arrivalDate", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Arrival" />,
    cell: ({ row }) =>
      [row.original.arrivalDate, row.original.arrivalTime].filter(Boolean).join(" "),
    filterFn: facetFilterFn,
  }),
  col.accessor("travel", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Travel" />,
  }),
  col.accessor("origin", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
  }),
];

const roomColumn = col.accessor("room", {
  header: ({ column }) => <DataTableColumnHeader column={column} title="Room" />,
  cell: ({ row }) =>
    row.original.room || <span className="text-muted-foreground">Unassigned</span>,
});

const uniq = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

export function AttendeesTable({ rows, showRoom }: { rows: AttendeeRow[]; showRoom: boolean }) {
  const data: Row[] = rows.map((r) => ({
    ...r,
    checkedInLabel: r.checkedIn ? "Checked in" : "Not yet",
  }));
  const columns = col.columns(showRoom ? [...baseColumns, roomColumn] : baseColumns);

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search names, allergies, towns…"
      emptyMessage="No one has registered yet."
      filters={[
        { id: "food", title: "Food", options: uniq(rows.map((r) => r.food)) },
        { id: "ageGroup", title: "Age", options: uniq(rows.map((r) => r.ageGroup)) },
        { id: "arrivalDate", title: "Arrival", options: uniq(rows.map((r) => r.arrivalDate)) },
        {
          id: "checkedInLabel",
          title: "Check-in",
          options: [
            { value: "Checked in", label: "Checked in" },
            { value: "Not yet", label: "Not yet" },
          ],
        },
      ]}
    />
  );
}
