"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { AttendeeRow } from "@/lib/event-registration";
import { answerText, fieldAnswer, type RegistrationField } from "@/lib/schemas/event-registration.schema";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";

const cedis = (n: number) =>
  `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Everything one person's registration says, opened from a table row. */
export function AttendeeSheet({
  row,
  rows,
  fields,
  showFees,
  showRoom,
  showContact,
  onSelect,
}: {
  row: AttendeeRow | null;
  /** All rows, for the others on the same booking. */
  rows: AttendeeRow[];
  fields: RegistrationField[];
  showFees: boolean;
  showRoom: boolean;
  showContact: boolean;
  /** Switch to another person, or null to close. */
  onSelect: (id: string | null) => void;
}) {
  const others = row ? rows.filter((r) => r.registrationId === row.registrationId && r.id !== row.id) : [];
  const answers = (scope: RegistrationField["scope"]) =>
    row
      ? fields
          .filter((f) => f.scope === scope)
          .map((f) => [f.label, answerText(fieldAnswer(row, f))] as const)
      : [];

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onSelect(null)}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {row && (
          <>
            <SheetHeader className="border-b pr-10">
              <SheetTitle>{row.name}</SheetTitle>
              <SheetDescription>
                {row.relationship === "Registrant" ? "Booked for themselves" : `${row.relationship} · booked by ${row.bookedBy}`}
                {" · "}
                {row.registeredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <Section title="Person">
                <Item label="Age group" value={row.ageGroup} missing="Not given" />
                <Item label="Gender" value={cap(row.gender)} />
                <Item label="Attending" value={row.attendance} />
                <Item label="From" value={[row.city, row.region, row.country].filter(Boolean).join(", ")} />
                {showContact && (
                  <>
                    <Item label="Phone" value={row.phone} />
                    <Item label="Email" value={row.email} />
                  </>
                )}
                <Item label="Checked in" value={row.checkedIn ? "Yes" : "Not yet"} />
                {showRoom && <Item label="Room" value={row.room} missing="Unassigned" />}
                {showFees && (
                  <>
                    <Item label="Price" value={row.tierName && `${row.tierName} · ${cedis(row.amount ?? 0)}`} />
                    <Item
                      label="Booking payment"
                      value={`${cedis(row.payment.amountPaid)} of ${cedis(row.payment.amountDue)} paid`}
                    />
                  </>
                )}
                {answers("person").map(([label, value]) => (
                  <Item key={label} label={label} value={value} />
                ))}
              </Section>

              {answers("booking").length > 0 && (
                <Section title="Booking">
                  {answers("booking").map(([label, value]) => (
                    <Item key={label} label={label} value={value} />
                  ))}
                </Section>
              )}

              {others.length > 0 && (
                <Section title={`Also on this booking (${others.length})`}>
                  {others.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onSelect(o.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">{o.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[o.relationship, o.ageGroup].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
            </div>

            {row.bookedByUserId && (
              <div className="border-t p-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/admin/content/events/${row.eventId}/register/${row.bookedByUserId}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit booking
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="divide-y rounded-md border">{children}</div>
    </section>
  );
}

function Item({ label, value, missing }: { label: string; value: string | null | undefined; missing?: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("break-words", !value && (missing ? TONE_TEXT.warning : "text-muted-foreground"))}>
        {value || missing || "—"}
      </span>
    </div>
  );
}

const cap = (s: string) => (s ? s[0] + s.slice(1).toLowerCase() : "");
