import Link from "next/link";
import { BedDouble, Download } from "lucide-react";
import { feeTotals, type AttendeeRow, type PendingBooking } from "@/lib/event-registration";
import { formatMoney, relTime } from "@/lib/format";
import type { RegistrationField } from "@/lib/schemas/event-registration.schema";
import type { RegistrationProgress } from "@/lib/registration-drafts";
import { Button } from "@/app/components/ui/button";
import { TabsContent } from "@/app/components/animate-ui/components/animate/tabs";
import { ClearPendingButton } from "./payment-actions";
import { AttendeesTable } from "./attendees-table";
import { DraftsTable } from "./drafts-table";
import { RegistrationViews } from "./registration-views";

export function RegistrationsPanel({
  eventId,
  isCamp,
  rows,
  fields,
  showFees,
  pending,
  progress,
  canManage,
  showContact,
}: {
  eventId: string;
  isCamp: boolean;
  rows: AttendeeRow[];
  fields: RegistrationField[];
  /** Event charges fees (pay at the event / online). */
  showFees: boolean;
  /** Online bookings awaiting payment; not in `rows` until paid. */
  pending: PendingBooking[];
  /** Registration funnel and unfinished forms. */
  progress: RegistrationProgress;
  /** May open, remind and discard drafts (events.manage). */
  canManage: boolean;
  /** May see email/phone (members.contact). */
  showContact: boolean;
}) {
  const fees = showFees ? feeTotals(rows) : null;
  const bookings = new Set(rows.map((r) => r.registrationId)).size;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
  const online = rows.filter((r) => r.attendance === "Online").length;
  // Contact details only reach the browser for roles with members.contact.
  const drafts = showContact
    ? progress.inProgress
    : progress.inProgress.map((d) => ({ ...d, email: "", phone: null }));

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

      <RegistrationViews
        views={[
          { value: "registered", label: "Registered", count: rows.length },
          { value: "in-progress", label: "In progress", count: drafts.length },
          ...(pending.length ? [{ value: "pending", label: "Awaiting payment", count: pending.length }] : []),
        ]}
      >
        <TabsContent value="registered">
          <AttendeesTable rows={rows} fields={fields} showRoom={isCamp} showFees={showFees} showContact={showContact} />
        </TabsContent>
        <TabsContent value="in-progress" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Started but not finished. Reminders go out automatically after a day without activity.
          </p>
          <DraftsTable eventId={eventId} drafts={drafts} canManage={canManage} showContact={showContact} />
        </TabsContent>
        {pending.length > 0 && (
          <TabsContent value="pending">
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
          </TabsContent>
        )}
      </RegistrationViews>
    </div>
  );
}
