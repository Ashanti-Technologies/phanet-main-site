import Link from "next/link";
import { Download } from "lucide-react";
import { tally, type AttendeeRow } from "@/lib/event-registration";
import {
  answerText,
  fieldAnswer,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AttendeesTable } from "./attendees-table";
import { Stat } from "./stat";

export function RegistrationsPanel({
  eventId,
  isCamp,
  rows,
  fields,
}: {
  eventId: string;
  isCamp: boolean;
  rows: AttendeeRow[];
  fields: RegistrationField[];
}) {
  const bookings = new Set(rows.map((r) => r.registrationId)).size;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        {isCamp && (
          <Button asChild variant="outline">
            <Link href={`/admin/content/events/${eventId}?tab=rooms`}>Allocate rooms</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <a href={`/admin/content/events/${eventId}/registrations/export`}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="People" value={rows.length} />
        <Stat label="Bookings" value={bookings} />
        <Stat label="Checked in" value={`${checkedIn} / ${rows.length}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Breakdown title="Age groups" rows={tally(rows, (r) => r.ageGroup)} />
        {summaryFields
          .filter((f) => !isListed(f))
          .map((f) => (
            <Breakdown key={f.id} title={f.label} rows={countAnswers(rows, f, fmtDay)} />
          ))}
      </div>

      {summaryFields.filter(isListed).map((f) => {
        const answered = rows.filter((r) => answerText(fieldAnswer(r, f)));
        if (!answered.length) return null;
        return (
          <Card key={f.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {f.label} · {answered.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {answered.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {answerText(fieldAnswer(r, f))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Everyone registered</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendeesTable rows={rows} fields={fields} showRoom={isCamp} />
        </CardContent>
      </Card>
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
  return tally(rows, (r) => answerText(fieldAnswer(r, f)));
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows.map(([label, n]) => (
              <li key={label} className="flex justify-between gap-4">
                <span>{label}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
