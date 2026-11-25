import { tally, type AttendeeRow } from "@/lib/event-registration";
import {
  answerText,
  fieldAnswer,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";
import type { RegistrationProgress } from "@/lib/registration-drafts";

/** Who's coming, in numbers: answer breakdowns, free-text answers and the form funnel. */
export function AnalyticsPanel({
  rows,
  fields,
  showFees,
  progress,
}: {
  rows: AttendeeRow[];
  fields: RegistrationField[];
  showFees: boolean;
  progress: RegistrationProgress;
}) {
  const hasDetailsStep = fields.some((f) => f.scope === "booking");
  const funnelSteps = progress.funnel.steps.filter((s) => s.step !== "DETAILS" || hasDetailsStep);
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

      {progress.funnel.started > 0 && (
        <section className="rounded-xl border bg-card">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-medium">Registration progress</h3>
            <p className="text-xs text-muted-foreground">
              Everyone who started the form since progress tracking began, by the furthest step they reached.
              {progress.funnel.reminded > 0 &&
                ` ${progress.funnel.completedAfterReminder} of ${progress.funnel.reminded} reminded finished afterwards.`}
            </p>
          </div>
          <ol className="flex flex-wrap gap-px bg-border">
            {[
              ...funnelSteps.map((s, i) => ({ label: i === 0 ? "Started" : s.label, count: s.count })),
              { label: "Booked", count: progress.funnel.completed },
            ].map((s) => (
              <li key={s.label} className="min-w-28 flex-1 bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {s.count}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {Math.round((s.count / progress.funnel.started) * 100)}%
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rows.length === 0 && progress.funnel.started === 0 && (
        <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
          Numbers show up here once people start registering.
        </p>
      )}
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
  if (f.type === "checkboxes" || f.type === "days" || f.type === "nights") {
    const counts = f.options.map((o): [string, number] => [
      o,
      rows.filter((r) => (fieldAnswer(r, f) as string[] | undefined)?.includes(o)).length,
    ]);
    // Days/nights read best in calendar order, with empty days showing as 0.
    if (f.type !== "checkboxes") return counts;
    return counts.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
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
