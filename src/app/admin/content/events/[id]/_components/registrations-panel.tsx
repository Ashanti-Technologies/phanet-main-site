import Link from "next/link";
import { BedDouble, Download } from "lucide-react";
import { feeTotals, tally, type AttendeeRow, type PendingBooking } from "@/lib/event-registration";
import { formatMoney, relTime } from "@/lib/format";
import { ClearPendingButton } from "./payment-actions";
import {
  answerText,
  fieldAnswer,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";
import { Button } from "@/app/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";
import { AttendeesTable } from "./attendees-table";

export function RegistrationsPanel({
  eventId,
  isCamp,
  rows,
  fields,
  showFees,
  pending,
}: {
  eventId: string;
  isCamp: boolean;
  rows: AttendeeRow[];
  fields: RegistrationField[];
  /** Event charges fees (pay at the event / online). */
  showFees: boolean;
  /** Online bookings awaiting payment; not in `rows` until paid. */
  pending: PendingBooking[];
}) {
  const fees = showFees ? feeTotals(rows) : null;
  const bookings = new Set(rows.map((r) => r.registrationId)).size;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
  const online = rows.filter((r) => r.attendance === "Online").length;
  const summaryFields = fields.filter((f) => f.summary);
  // Free-text answers are listed by name (e.g. allergies for the kitchen);
  // everything else is counted.
  const isListed = (f: RegistrationField) => TEXT_TYPES.includes(f.type);
  const fmtDay = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const breakdowns: [string, [string, number][]][] = [
    ...(online ? [["Attending", tally(rows, (r) => r.attendance)] as [string, [string, number][]]] : []),
    ["Countries", tally(rows, (r) => r.country)],
    ["Age groups", tally(rows, (r) => r.ageGroup)],
    ...(showFees ? [["Prices", tally(rows, (r) => r.tierName, "No price")] as [string, [string, number][]]] : []),
    ...summaryFields
      .filter((f) => !isListed(f))
      .map((f): [string, [string, number][]] => [f.label, countAnswers(rows, f, fmtDay)]),
  ];
  const listed = summaryFields
    .filter(isListed)
    .map((f) => ({ f, answered: rows.filter((r) => answerText(fieldAnswer(r, f))) }))
    .filter((x) => x.answered.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium tabular-nums text-foreground">{rows.length}</span>{" "}
          {rows.length === 1 ? "person" : "people"} in{" "}
          <span className="font-mono font-medium tabular-nums text-foreground">{bookings}</span>{" "}
          {bookings === 1 ? "booking" : "bookings"} ·{" "}
          {online > 0 && (
            <>
              <span className="font-mono font-medium tabular-nums text-foreground">{online}</span> online ·{" "}
            </>
          )}
          <span className="font-mono font-medium tabular-nums text-foreground">{checkedIn}</span> checked in
          {fees && (
            <>
              {" · "}
              <span className="font-mono font-medium tabular-nums text-foreground">{formatMoney(fees.collected)}</span>{" "}
              of {formatMoney(fees.expected)} collected
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {isCamp && (
            <Button asChild variant="outline" size="sm">
              <Link href="?tab=rooms">
                <BedDouble className="mr-1.5 h-3.5 w-3.5" />
                Allocate rooms
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/content/events/${eventId}/registrations/export`}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        // Flex (not grid) so the last row stretches instead of leaving empty cells.
        <section className="flex flex-wrap gap-px overflow-hidden rounded-xl border bg-border">
          {breakdowns.map(([title, counts]) => (
            <BarList key={title} title={title} rows={counts} total={rows.length} />
          ))}
        </section>
      )}

      {listed.length > 0 && (
        <Accordion type="multiple" className="rounded-xl border bg-card px-5">
          {listed.map(({ f, answered }) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="hover:no-underline">
                <span>
                  {f.label}{" "}
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {answered.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {answered.map((r) => (
                    <li key={r.id}>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground"> — {answerText(fieldAnswer(r, f))}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {pending.length > 0 && (
        <section className="rounded-xl border bg-card">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-medium">Awaiting online payment ({pending.length})</h3>
            <p className="text-xs text-muted-foreground">
              Not counted above until paid. Clear abandoned ones so those people can book again.
            </p>
          </div>
          <ul className="divide-y">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{p.bookedBy}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.contact} · {p.people} {p.people === 1 ? "person" : "people"} · {formatMoney(p.amountDue)} ·
                    started {relTime(p.createdAt)}
                  </p>
                </div>
                <ClearPendingButton registrationId={p.id} name={p.bookedBy} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <AttendeesTable rows={rows} fields={fields} showRoom={isCamp} showFees={showFees} />
    </div>
  );
}

const TEXT_TYPES: RegistrationField["type"][] = ["text", "textarea", "phone"];

/** People per answer. Each ticked option counts once; dates sort by day. */
function countAnswers(
  rows: AttendeeRow[],
  f: RegistrationField,
  fmtDay: (d: string) => string,
): [string, number][] {
  if (f.type === "checkboxes") {
    return f.options
      .map((o): [string, number] => [
        o,
        rows.filter((r) => (fieldAnswer(r, f) as string[] | undefined)?.includes(o)).length,
      ])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
  }
  if (f.type === "date") {
    return tally(rows, (r) => answerText(fieldAnswer(r, f)))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, n]) => [/^\d{4}-/.test(d) ? fmtDay(d) : d, n]);
  }
  if (f.type === "location") {
    // Where people come from, by region (the town list is in the CSV).
    return tally(rows, (r) => {
      const v = fieldAnswer(r, f);
      return Array.isArray(v) ? answerText([v[1] || "Region not given", v[2]]) : "";
    });
  }
  return tally(rows, (r) => answerText(fieldAnswer(r, f)));
}

/** Counts as rows with a proportional bar behind each (share of everyone). */
function BarList({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div className="min-w-60 flex-1 space-y-3 bg-card p-5">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answers yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map(([label, n]) => (
            <li key={label} className="relative flex justify-between gap-4 rounded-md px-2 py-1 text-sm">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
                style={{ width: `${(n / total) * 100}%` }}
              />
              <span className="relative truncate">{label}</span>
              <span className="relative font-mono tabular-nums text-muted-foreground">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
