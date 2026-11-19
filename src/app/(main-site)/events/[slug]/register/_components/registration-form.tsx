"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  cancelEventRegistration,
  findPersonForRegistration,
  submitEventRegistration,
} from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { RegistrationFieldInput } from "@/app/components/registration-field";
import {
  checkAnswer,
  type AnswerValue,
  type Answers,
  type AttendeeInput,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";

type AgeGroup = "ADULT" | "TEEN" | "CHILD" | "INFANT";
type Relationship = "SELF" | "SPOUSE" | "CHILD" | "RELATIVE" | "GUEST";

export type FormRow = {
  key: string;
  kind: "self" | "known" | "lookup" | "new";
  label: string;
  memberId?: string;
  contact?: string;
  relationship: Relationship;
  fullName?: string;
  gender?: "MALE" | "FEMALE";
  phone?: string;
  email?: string;
  ageGroup?: AgeGroup;
  priceTierId?: string;
  /** What this person already owes on the saved booking (kept while their tier is unchanged). */
  booked?: { priceTierId: string | null; amount: number | null };
  answers: Answers;
};

export type PriceTier = { id: string; name: string; description: string | null; amount: number };

type Props = {
  event: {
    id: string;
    slug: string;
    type: "MEETING" | "CAMP";
    fields: RegistrationField[];
    paymentMode: "FREE" | "DISPLAY_ONLY" | "PAY_AT_EVENT" | "ONLINE";
    /** Only for events that charge (PAY_AT_EVENT / ONLINE). */
    tiers: PriceTier[];
    /** Already paid on the saved booking. */
    amountPaid: number;
  };
  open: boolean;
  /** "/register" on the hoe. subdomain, else /events/<slug>/register */
  registerPath: string;
  me: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    location: string[] | null;
  } | null;
  sessionUser: { name: string; email: string };
  /** Household plus anyone booked before, with their last relationship. */
  household: { id: string; fullName: string; relationship: Exclude<Relationship, "SELF"> }[];
  /** Person answers from each member's latest booking, to pre-fill. */
  previous: Record<string, Answers>;
  existing: { rows: FormRow[]; answers: Answers } | null;
};

const RELATIONSHIPS: [Relationship, string][] = [
  ["SPOUSE", "Spouse"],
  ["CHILD", "Child"],
  ["RELATIVE", "Relative"],
  ["GUEST", "Guest"],
];
const GENDERS: [string, string][] = [
  ["MALE", "Male"],
  ["FEMALE", "Female"],
];
const cedis = (n: number) =>
  n === 0 ? "Free" : `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Mirrors the server: people keep their booked price while their tier is unchanged. */
function rowPrice(row: FormRow, tiers: PriceTier[]) {
  if (row.booked && row.booked.priceTierId === row.priceTierId && row.booked.amount != null) {
    return row.booked.amount;
  }
  return tiers.find((t) => t.id === row.priceTierId)?.amount ?? 0;
}

const AGE_GROUPS: [AgeGroup, string][] = [
  ["ADULT", "Adult (18+)"],
  ["TEEN", "Teen (13–17)"],
  ["CHILD", "Child (3–12)"],
  ["INFANT", "Infant (0–2)"],
];

export function RegistrationForm(props: Props) {
  const { event, open, me, household, previous, existing } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** Inline errors, keyed by the field's DOM id. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmCancel, setConfirmCancel] = useState(false);

  const blank = (memberId?: string) => ({
    answers: (memberId && previous[memberId]) || {},
  });

  const [self, setSelf] = useState({
    fullName: props.sessionUser.name,
    phone: "",
    gender: undefined as "MALE" | "FEMALE" | undefined,
  });
  const [rows, setRows] = useState<FormRow[]>(
    () =>
      existing?.rows ?? [
        {
          key: "self",
          kind: "self",
          label: me?.fullName ?? "You",
          memberId: me?.id,
          relationship: "SELF",
          ...blank(me?.id),
        },
      ],
  );
  const [answers, setAnswers] = useState<Answers>(
    () =>
      existing?.answers ??
      // New booking: start location questions from the member's profile.
      Object.fromEntries(
        me?.location
          ? event.fields
              .filter((f) => f.scope === "booking" && f.type === "location")
              .map((f) => [f.id, me.location!])
          : [],
      ),
  );

  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<
    { name: string } | "none" | null
  >(null);
  const [isLooking, startLookup] = useTransition();

  const attending = rows.some((r) => r.kind === "self");
  const charges = event.tiers.length > 0;
  // Cent-safe sum for display; the server re-prices authoritatively.
  const total = rows.reduce((sum, r) => sum + Math.round(rowPrice(r, event.tiers) * 100), 0) / 100;
  const toPay = Math.max(0, Math.round((total - event.amountPaid) * 100) / 100);
  const paysOnline = event.paymentMode === "ONLINE" && toPay > 0;
  const bookingFields = event.fields.filter((f) => f.scope === "booking");
  const personFields = event.fields.filter((f) => f.scope === "person");
  const addableHousehold = household.filter(
    (h) => !rows.some((r) => r.memberId === h.id),
  );

  const updateRow = (key: string, patch: Partial<FormRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const clearFieldError = (domId: string) =>
    setFieldErrors((e) => {
      if (!(domId in e)) return e;
      const { [domId]: _, ...rest } = e;
      return rest;
    });

  /** Same rules as the server (checkAnswer); returns DOM id → message. */
  function findFieldErrors() {
    const errors: Record<string, string> = {};
    const check = (domId: string, f: RegistrationField, v: AnswerValue | undefined) => {
      const res = checkAnswer(f, v);
      if (!res.ok) errors[domId] = res.error;
    };
    for (const f of bookingFields) check(`booking-${f.id}`, f, answers[f.id]);
    for (const r of rows) {
      for (const f of personFields) check(`${r.key}-${f.id}`, f, r.answers[f.id]);
    }
    return errors;
  }
  const addRow = (row: Omit<FormRow, "key">) =>
    setRows((rs) => [...rs, { ...row, key: crypto.randomUUID() }]);

  function toggleSelf(on: boolean) {
    if (!on) return setRows((rs) => rs.filter((r) => r.kind !== "self"));
    setRows((rs) => [
      {
        key: "self",
        kind: "self",
        label: me?.fullName ?? "You",
        memberId: me?.id,
        relationship: "SELF",
        ...blank(me?.id),
      },
      ...rs,
    ]);
  }

  function runLookup() {
    setLookupResult(null);
    startLookup(async () => {
      const res = await findPersonForRegistration(lookup);
      if (!res.success) return setError(res.error);
      setLookupResult(res.data ?? "none");
    });
  }

  function submit() {
    setError(null);
    if (!me && self.fullName.trim().length < 2) return setError("Please enter your name.");
    for (const r of rows.filter((r) => r.kind === "new")) {
      if (!r.fullName?.trim() || !r.gender || !r.ageGroup) {
        return setError("Each person you add needs a name, gender and age group.");
      }
    }
    if (charges && rows.some((r) => !r.priceTierId)) {
      return setError("Pick a price for everyone on the booking.");
    }
    const errors = findFieldErrors();
    setFieldErrors(errors);
    const firstId = Object.keys(errors)[0];
    if (firstId) {
      const wrapper = document.querySelector(`[data-field-id="${CSS.escape(firstId)}"]`);
      wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });
      wrapper
        ?.querySelector<HTMLElement>("input, textarea, button")
        ?.focus({ preventScroll: true });
      return setError("Please fix the highlighted questions.");
    }

    const attendees: AttendeeInput[] = rows.map((r) => {
      const details = { ageGroup: r.ageGroup, priceTierId: charges ? r.priceTierId : undefined, answers: r.answers };
      const rel = r.relationship as Exclude<Relationship, "SELF">;
      switch (r.kind) {
        case "self":
          return { kind: "self", ...details };
        case "known":
          return { kind: "known", memberId: r.memberId!, relationship: rel, ...details };
        case "lookup":
          return { kind: "lookup", contact: r.contact!, relationship: rel, ...details };
        case "new":
          return {
            kind: "new",
            fullName: r.fullName!,
            gender: r.gender!,
            phone: r.phone,
            email: r.email ?? "",
            relationship: rel,
            ...details,
            ageGroup: r.ageGroup!,
          };
      }
    });

    startTransition(async () => {
      const res = await submitEventRegistration({
        eventId: event.id,
        self: me ? undefined : self,
        answers,
        attendees,
      });
      if (!res.success) return setError(res.error);
      if (res.data.payUrl) {
        // Paystack's hosted checkout; it returns to this page with ?reference=….
        window.location.href = res.data.payUrl;
        return;
      }
      router.replace(
        res.data.paymentError ? `${props.registerPath}?payment=unavailable` : `${props.registerPath}?done=1`,
        { scroll: true },
      );
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      const res = await cancelEventRegistration(event.id);
      if (!res.success) return setError(res.error);
      router.replace(`${props.registerPath}?cancelled=1`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-5" aria-busy={isPending}>
      {!open && (
        <p className="rounded-2xl border bg-muted p-4 text-sm">
          Registration has closed, so your booking can no longer be changed.
          Contact the organisers if something is wrong.
        </p>
      )}

      <fieldset disabled={!open || isPending} className="space-y-5">
        {/* 1. You */}
        <Section step={1} title="You">
          {me ? (
            <div className="flex items-center gap-3">
              <Avatar name={me.fullName} />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{me.fullName}</p>
                <p className="truncate text-muted-foreground">
                  {[me.email, me.phone].filter(Boolean).join(" · ")}
                </p>
                <Link
                  href="/me/profile/edit"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Not right? Update your profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" id="self-name">
                <Input
                  id="self-name"
                  value={self.fullName}
                  onChange={(e) => setSelf({ ...self, fullName: e.target.value })}
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone" id="self-phone">
                <Input
                  id="self-phone"
                  type="tel"
                  inputMode="tel"
                  value={self.phone}
                  onChange={(e) => setSelf({ ...self, phone: e.target.value })}
                  autoComplete="tel"
                />
              </Field>
              <Field label="Gender" id="self-gender" className="sm:col-span-2">
                <Pick
                  id="self-gender"
                  value={self.gender}
                  onChange={(v) => setSelf({ ...self, gender: v as "MALE" | "FEMALE" })}
                  options={GENDERS}
                />
              </Field>
            </div>
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <Checkbox checked={attending} onCheckedChange={(v) => toggleSelf(v === true)} />
            I&apos;m attending this event
          </label>
        </Section>

        {/* 2. Who's coming */}
        <Section
          step={2}
          title="Who's coming"
          hint="Everyone on this booking, including children."
        >
          <div className="space-y-3">
            {rows.map((row) => (
              <PersonCard
                key={row.key}
                row={row}
                selfName={me?.fullName ?? (self.fullName || "You")}
                personFields={personFields}
                tiers={event.tiers}
                fieldErrors={fieldErrors}
                onAnswer={(fieldId, v) => {
                  updateRow(row.key, { answers: { ...row.answers, [fieldId]: v } });
                  clearFieldError(`${row.key}-${fieldId}`);
                }}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() =>
                  row.kind === "self"
                    ? toggleSelf(false)
                    : setRows((rs) => rs.filter((r) => r.key !== row.key))
                }
              />
            ))}
            {rows.length === 0 && (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                No one added yet.
              </p>
            )}
          </div>

          <div className="space-y-4 border-t pt-5">
            <p className="text-sm font-semibold">Add someone</p>

            {addableHousehold.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Your household and past guests</p>
                <div className="flex flex-wrap gap-2">
                  {addableHousehold.map((h) => (
                    <Button
                      key={h.id}
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full"
                      onClick={() =>
                        addRow({
                          kind: "known",
                          memberId: h.id,
                          label: h.fullName,
                          relationship: h.relationship,
                          ...blank(h.id),
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      {h.fullName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="lookup" className="text-xs font-normal text-muted-foreground">
                Already in our records? Search their exact phone or email.
              </Label>
              <div className="flex gap-2">
                <Input
                  id="lookup"
                  value={lookup}
                  onChange={(e) => {
                    setLookup(e.target.value);
                    setLookupResult(null);
                  }}
                  onKeyDown={(e) => {
                    // Enter searches instead of submitting the whole booking.
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (lookup.trim().length >= 3) runLookup();
                  }}
                  enterKeyHint="search"
                  placeholder="0244 123 456 or name@example.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 shrink-0"
                  onClick={runLookup}
                  disabled={lookup.trim().length < 3 || isLooking}
                  aria-label="Find"
                >
                  {isLooking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Find</span>
                </Button>
              </div>
              {lookupResult === "none" && (
                <p className="text-sm text-muted-foreground">
                  No match. Add them manually below.
                </p>
              )}
              {lookupResult && lookupResult !== "none" && (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={lookupResult.name} small />
                    <strong className="truncate">{lookupResult.name}</strong>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      addRow({
                        kind: "lookup",
                        contact: lookup.trim(),
                        label: lookupResult.name,
                        relationship: "GUEST",
                        ...blank(),
                      });
                      setLookup("");
                      setLookupResult(null);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full border-dashed"
              onClick={() =>
                addRow({
                  kind: "new",
                  label: "New person",
                  relationship: "CHILD",
                  fullName: "",
                  ...blank(),
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add someone new
            </Button>
          </div>
        </Section>

        {/* 3. The event's own questions (built in the admin form builder) */}
        {bookingFields.length > 0 && (
          <Section step={3} title="A few more details">
            <div className="space-y-5">
              {bookingFields.map((f) => {
                const domId = `booking-${f.id}`;
                return (
                  <RegistrationFieldInput
                    key={f.id}
                    id={domId}
                    field={f}
                    value={answers[f.id]}
                    error={fieldErrors[domId]}
                    onChange={(v) => {
                      setAnswers((a) => ({ ...a, [f.id]: v }));
                      clearFieldError(domId);
                    }}
                  />
                );
              })}
            </div>
          </Section>
        )}
      </fieldset>

      {open && (
        <>
          {/* Thumb-zone action bar: stays in view on phones while scrolling. */}
          <div className="sticky bottom-0 z-20 -mx-4 space-y-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-card sm:p-4">
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {rows.length}
                </span>{" "}
                {rows.length === 1 ? "person" : "people"}
                {charges && (
                  <>
                    {" · "}
                    <span className="font-semibold text-foreground tabular-nums">{cedis(total)}</span>
                    {event.amountPaid > 0 && toPay > 0 && <> ({cedis(toPay)} to pay)</>}
                    {event.paymentMode === "PAY_AT_EVENT" && toPay > 0 && <> at the event</>}
                  </>
                )}
              </p>
              <Button
                type="submit"
                size="lg"
                className="h-12 flex-1 sm:flex-none sm:px-8"
                disabled={isPending || rows.length === 0}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paysOnline ? "Continue to payment" : existing ? "Save changes" : "Complete registration"}
              </Button>
            </div>
          </div>

          {existing && (
            <div className="flex justify-center pt-2 text-sm">
              {confirmCancel ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span>Cancel the whole booking?</span>
                  <Button type="button" variant="destructive" size="sm" onClick={cancel} disabled={isPending}>
                    Yes, cancel
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                    Keep it
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                >
                  Cancel registration
                </button>
              )}
            </div>
          )}
        </>
      )}
    </form>
  );
}

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  SELF: "You",
  SPOUSE: "Spouse",
  CHILD: "Child",
  RELATIVE: "Relative",
  GUEST: "Guest",
};

function PersonCard({
  row,
  selfName,
  personFields,
  tiers,
  fieldErrors,
  onAnswer,
  onChange,
  onRemove,
}: {
  row: FormRow;
  selfName: string;
  personFields: RegistrationField[];
  tiers: PriceTier[];
  fieldErrors: Record<string, string>;
  onAnswer: (fieldId: string, value: AnswerValue) => void;
  onChange: (patch: Partial<FormRow>) => void;
  onRemove: () => void;
}) {
  const k = row.key;
  const name =
    row.kind === "self" ? selfName : row.kind === "new" ? row.fullName || "New person" : row.label;
  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABEL[row.relationship]}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {row.kind === "new" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" id={`${k}-name`} className="sm:col-span-2">
            <Input
              id={`${k}-name`}
              value={row.fullName ?? ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Gender *" id={`${k}-gender`} className="sm:col-span-2">
            <Pick
              id={`${k}-gender`}
              value={row.gender}
              onChange={(v) => onChange({ gender: v as "MALE" | "FEMALE" })}
              options={GENDERS}
            />
          </Field>
          <Field label="Phone" id={`${k}-phone`}>
            <Input
              id={`${k}-phone`}
              type="tel"
              inputMode="tel"
              value={row.phone ?? ""}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </Field>
          <Field label="Email" id={`${k}-email`}>
            <Input
              id={`${k}-email`}
              type="email"
              inputMode="email"
              value={row.email ?? ""}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </Field>
        </div>
      )}

      {row.kind !== "self" && (
        <Field label="Relationship" id={`${k}-rel`}>
          <Pick
            id={`${k}-rel`}
            value={row.relationship}
            onChange={(v) => onChange({ relationship: v as Relationship })}
            options={RELATIONSHIPS}
          />
        </Field>
      )}
      <Field label={row.kind === "new" ? "Age group *" : "Age group"} id={`${k}-age`}>
        <Pick
          id={`${k}-age`}
          value={row.ageGroup}
          onChange={(v) => onChange({ ageGroup: v as AgeGroup })}
          options={AGE_GROUPS}
          columns={2}
        />
      </Field>
      {tiers.length > 0 && (
        <Field label="Price *" id={`${k}-price`}>
          <Pick
            id={`${k}-price`}
            value={row.priceTierId}
            onChange={(v) => onChange({ priceTierId: v })}
            options={tiers.map((t) => [
              t.id,
              `${t.name} · ${
                row.booked?.priceTierId === t.id && row.booked.amount != null
                  ? cedis(row.booked.amount)
                  : cedis(t.amount)
              }`,
            ])}
            columns={2}
          />
          {tiers.find((t) => t.id === row.priceTierId)?.description && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {tiers.find((t) => t.id === row.priceTierId)!.description}
            </p>
          )}
        </Field>
      )}
      {personFields.map((f) => (
        <RegistrationFieldInput
          key={f.id}
          id={`${k}-${f.id}`}
          field={f}
          value={row.answers[f.id]}
          error={fieldErrors[`${k}-${f.id}`]}
          onChange={(v) => onAnswer(f.id, v)}
        />
      ))}
    </div>
  );
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ${small ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm"}`}
    >
      {initials || "?"}
    </span>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground"
        >
          {step}
        </span>
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold leading-7">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Tap-friendly radio chips: every option visible, one tap to pick (no dropdown). */
function Pick({
  id,
  value,
  onChange,
  options,
  columns,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
  columns?: number;
}) {
  const cols = columns ?? options.length;
  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}
    >
      {options.map(([v, l]) => (
        <label
          key={v}
          className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm font-medium transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
        >
          <input
            type="radio"
            name={id}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="sr-only"
          />
          {l}
        </label>
      ))}
    </div>
  );
}
