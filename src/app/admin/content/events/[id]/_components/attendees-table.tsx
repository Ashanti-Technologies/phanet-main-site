"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import { setAttendeeCheckIn } from "@/actions/event-registrations";
import { Checkbox } from "@/app/components/ui/checkbox";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import type { AttendeeRow } from "@/lib/event-registration";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";
import { RecordPaymentDialog } from "./payment-actions";
import {
  answerText,
  fieldAnswer,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";

type Row = AttendeeRow & { checkedInLabel: string; paymentLabel: string; leadsBooking: boolean };

const col = columnHelper<Row>();

const PAYMENT_LABEL: Record<AttendeeRow["payment"]["state"], string> = {
  free: "No fee",
  unpaid: "Unpaid",
  partial: "Part paid",
  paid: "Paid",
  overpaid: "Overpaid",
};
const PAYMENT_TONE: Record<AttendeeRow["payment"]["state"], string> = {
  free: "text-muted-foreground",
  unpaid: TONE_TEXT.warning,
  partial: TONE_TEXT.warning,
  paid: TONE_TEXT.success,
  overpaid: TONE_TEXT.danger,
};
const cedis = (n: number) => `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Payment is per booking: its first row carries the action (the booker may not be attending).
const feeColumns = [
  col.accessor("tierName", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
    cell: ({ row }) =>
      row.original.tierName ? (
        <div>
          <p>{row.original.tierName}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{cedis(row.original.amount ?? 0)}</p>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    filterFn: facetFilterFn,
  }),
  col.accessor("paymentLabel", {
    header: "Payment",
    cell: ({ row }) => {
      const { payment, leadsBooking, registrationId, bookedBy } = row.original;
      return (
        <div className="space-y-1">
          <p className={`text-sm font-medium ${PAYMENT_TONE[payment.state]}`}>
            {row.original.paymentLabel}
            {payment.state === "partial" && (
              <span className="font-normal text-muted-foreground"> · {cedis(payment.balance)} owed</span>
            )}
          </p>
          {leadsBooking && payment.balance > 0 && (
            <RecordPaymentDialog registrationId={registrationId} bookedBy={bookedBy} balance={payment.balance} />
          )}
        </div>
      );
    },
    filterFn: facetFilterFn,
    enableSorting: false,
  }),
];


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
];

/** One column per form field; dropdown fields also get a facet filter. */
const fieldColumn = (f: RegistrationField) =>
  col.accessor((r) => answerText(fieldAnswer(r, f)), {
    id: `f_${f.id}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title={f.label} />,
    cell: ({ getValue }) => (
      <span className="line-clamp-2 max-w-xs" title={getValue()}>
        {getValue()}
      </span>
    ),
    filterFn: facetFilterFn,
  });

const roomColumn = col.accessor("room", {
  header: ({ column }) => <DataTableColumnHeader column={column} title="Room" />,
  cell: ({ row }) =>
    row.original.room || <span className={TONE_TEXT.warning}>Unassigned</span>,
});

const uniq = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

export function AttendeesTable({
  rows,
  fields,
  showRoom,
  showFees,
}: {
  rows: AttendeeRow[];
  fields: RegistrationField[];
  showRoom: boolean;
  /** Event charges fees (pay at the event / online). */
  showFees: boolean;
}) {
  const seen = new Set<string>();
  const data: Row[] = rows.map((r) => ({
    ...r,
    leadsBooking: !seen.has(r.registrationId) && !!seen.add(r.registrationId),
    checkedInLabel: r.checkedIn ? "Checked in" : "Not yet",
    paymentLabel: PAYMENT_LABEL[r.payment.state],
  }));
  const columns = useMemo(
    () =>
      col.columns([
        ...baseColumns,
        ...(showFees ? feeColumns : []),
        ...fields.map(fieldColumn),
        ...(showRoom ? [roomColumn] : []),
      ]),
    [fields, showRoom, showFees],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search names and answers…"
      emptyMessage="No one has registered yet."
      filters={[
        { id: "ageGroup", title: "Age", options: uniq(rows.map((r) => r.ageGroup)) },
        ...fields
          .filter((f) => f.type === "select")
          .map((f) => ({
            id: `f_${f.id}`,
            title: f.label,
            options: uniq(rows.map((r) => answerText(fieldAnswer(r, f)))),
          })),
        ...(showFees
          ? [
              { id: "paymentLabel", title: "Payment", options: uniq(data.map((r) => r.paymentLabel)) },
              { id: "tierName", title: "Price", options: uniq(rows.map((r) => r.tierName)) },
            ]
          : []),
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
