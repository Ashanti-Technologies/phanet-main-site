"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2, UserRound } from "lucide-react";
import {
  cancelEventRegistration,
  findPersonForRegistration,
  submitEventRegistration,
} from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  DIETARY_OPTIONS,
  type AttendeeInput,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";

type AgeGroup = "ADULT" | "TEEN" | "CHILD" | "INFANT";
type Relationship = "SELF" | "SPOUSE" | "CHILD" | "GUEST";
type Answers = Record<string, string | boolean>;

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
  dietaryPreference: string;
  allergies: string;
  answers: Answers;
};

type Props = {
  event: {
    id: string;
    slug: string;
    type: "MEETING" | "CAMP";
    fields: RegistrationField[];
  };
  open: boolean;
  /** "/register" on the hoe. subdomain, else /events/<slug>/register */
  registerPath: string;
  me: { id: string; fullName: string; email: string; phone: string | null } | null;
  sessionUser: { name: string; email: string };
  household: { id: string; fullName: string }[];
  previous: Record<string, { dietaryPreference: string; allergies: string }>;
  defaultOrigin: string;
  defaultArrival: string;
  existing: {
    rows: FormRow[];
    arrivalDate: string;
    arrivalTime: string;
    travelMode: string;
    origin: string;
    notes: string;
    contactConsent: boolean;
    answers: Answers;
  } | null;
};

const RELATIONSHIPS: [Relationship, string][] = [
  ["SPOUSE", "Spouse"],
  ["CHILD", "Child"],
  ["GUEST", "Guest"],
];
const AGE_GROUPS: [AgeGroup, string][] = [
  ["ADULT", "Adult (18+)"],
  ["TEEN", "Teen (13–17)"],
  ["CHILD", "Child (3–12)"],
  ["INFANT", "Infant (0–2)"],
];
const TRAVEL_MODES: [string, string][] = [
  ["PRIVATE_CAR", "Private car"],
  ["PUBLIC_TRANSPORT", "Public transport"],
  ["ORGANISED_TRANSPORT", "Church / organised transport"],
  ["FLIGHT", "Flight"],
  ["OTHER", "Other"],
];

export function RegistrationForm(props: Props) {
  const { event, open, me, household, previous, existing } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const blank = (memberId?: string) => ({
    dietaryPreference: (memberId && previous[memberId]?.dietaryPreference) || "",
    allergies: (memberId && previous[memberId]?.allergies) || "",
    answers: {},
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
  const [booking, setBooking] = useState({
    arrivalDate: existing?.arrivalDate ?? props.defaultArrival,
    arrivalTime: existing?.arrivalTime ?? "",
    travelMode: existing?.travelMode ?? "",
    origin: existing?.origin ?? props.defaultOrigin,
    notes: existing?.notes ?? "",
    contactConsent: existing?.contactConsent ?? false,
    answers: existing?.answers ?? ({} as Answers),
  });

  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<
    { name: string } | "none" | null
  >(null);
  const [isLooking, startLookup] = useTransition();

  const attending = rows.some((r) => r.kind === "self");
  const bookingFields = event.fields.filter((f) => f.scope === "booking");
  const personFields = event.fields.filter((f) => f.scope === "person");
  const addableHousehold = household.filter(
    (h) => !rows.some((r) => r.memberId === h.id),
  );

  const updateRow = (key: string, patch: Partial<FormRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
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
    if (!booking.arrivalDate) return setError("Please choose your arrival date.");

    const attendees: AttendeeInput[] = rows.map((r) => {
      const details = {
        dietaryPreference: r.dietaryPreference,
        allergies: r.allergies,
        ageGroup: r.ageGroup,
        answers: r.answers,
      };
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
        ...booking,
        travelMode: (booking.travelMode || undefined) as never,
        attendees,
      });
      if (!res.success) return setError(res.error);
      router.replace(`${props.registerPath}?done=1`, { scroll: true });
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
    <form
      action={submit}
      className="space-y-8"
      aria-busy={isPending}
    >
      {!open && (
        <p className="rounded-md border bg-muted p-3 text-sm">
          Registration has closed, so your booking can no longer be changed.
          Contact the organisers if something is wrong.
        </p>
      )}

      <fieldset disabled={!open || isPending} className="space-y-8">
        {/* 1. You */}
        <Section title="You">
          {me ? (
            <div className="flex items-start gap-3 text-sm">
              <UserRound className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="font-medium">{me.fullName}</p>
                <p className="text-muted-foreground">
                  {[me.email, me.phone].filter(Boolean).join(" · ")}
                </p>
                <Link
                  href="/me/profile/edit"
                  className="text-xs underline-offset-4 hover:underline"
                >
                  Not right? Update your profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
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
                  value={self.phone}
                  onChange={(e) => setSelf({ ...self, phone: e.target.value })}
                  autoComplete="tel"
                />
              </Field>
              <Field label="Gender" id="self-gender">
                <Pick
                  id="self-gender"
                  value={self.gender}
                  onChange={(v) => setSelf({ ...self, gender: v as "MALE" | "FEMALE" })}
                  options={[
                    ["MALE", "Male"],
                    ["FEMALE", "Female"],
                  ]}
                />
              </Field>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={attending} onCheckedChange={(v) => toggleSelf(v === true)} />
            I&apos;m attending
          </label>
        </Section>

        {/* 2. Who's coming */}
        <Section
          title="Who's coming"
          hint="Food and allergies help the kitchen plan. Leave blank if none."
        >
          <div className="space-y-4">
            {rows.map((row) => (
              <PersonCard
                key={row.key}
                row={row}
                selfName={me?.fullName ?? (self.fullName || "You")}
                personFields={personFields}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() =>
                  row.kind === "self"
                    ? toggleSelf(false)
                    : setRows((rs) => rs.filter((r) => r.key !== row.key))
                }
              />
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No one added yet.
              </p>
            )}
          </div>

          {addableHousehold.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">From your household</p>
              <div className="flex flex-wrap gap-2">
                {addableHousehold.map((h) => (
                  <Button
                    key={h.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addRow({
                        kind: "known",
                        memberId: h.id,
                        label: h.fullName,
                        relationship: "CHILD",
                        ...blank(h.id),
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {h.fullName}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lookup">Already in our records?</Label>
            <p className="text-xs text-muted-foreground">
              Search by their exact phone number or email.
            </p>
            <div className="flex gap-2">
              <Input
                id="lookup"
                value={lookup}
                onChange={(e) => {
                  setLookup(e.target.value);
                  setLookupResult(null);
                }}
                placeholder="0244 123 456 or name@example.com"
              />
              <Button
                type="button"
                variant="outline"
                onClick={runLookup}
                disabled={lookup.trim().length < 3 || isLooking}
              >
                {isLooking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Find</span>
              </Button>
            </div>
            {lookupResult === "none" && (
              <p className="text-sm text-muted-foreground">
                No match. Add them manually below.
              </p>
            )}
            {lookupResult && lookupResult !== "none" && (
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>
                  Found <strong>{lookupResult.name}</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
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
                  Add
                </Button>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
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
            <Plus className="mr-2 h-4 w-4" />
            Add someone manually
          </Button>
        </Section>

        {/* 3. Travel */}
        <Section title="Travel">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Arrival date *" id="arrivalDate">
              <Input
                id="arrivalDate"
                type="date"
                required
                value={booking.arrivalDate}
                onChange={(e) => setBooking({ ...booking, arrivalDate: e.target.value })}
              />
            </Field>
            <Field label="Arrival time" id="arrivalTime">
              <Input
                id="arrivalTime"
                type="time"
                value={booking.arrivalTime}
                onChange={(e) => setBooking({ ...booking, arrivalTime: e.target.value })}
              />
            </Field>
            <Field label="Travelling by" id="travelMode">
              <Pick
                id="travelMode"
                value={booking.travelMode}
                onChange={(v) => setBooking({ ...booking, travelMode: v })}
                options={TRAVEL_MODES}
              />
            </Field>
          </div>
          <Field label="Coming from" id="origin">
            <Input
              id="origin"
              value={booking.origin}
              onChange={(e) => setBooking({ ...booking, origin: e.target.value })}
              placeholder="City / town"
            />
          </Field>
        </Section>

        {/* 4. Anything else */}
        <Section title="Anything else">
          {bookingFields.map((f) => (
            <QuestionField
              key={f.id}
              idPrefix="booking"
              field={f}
              value={booking.answers[f.id]}
              onChange={(v) =>
                setBooking({ ...booking, answers: { ...booking.answers, [f.id]: v } })
              }
            />
          ))}
          <Field label="Notes for the organisers" id="notes">
            <Textarea
              id="notes"
              rows={3}
              value={booking.notes}
              onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={booking.contactConsent}
              onCheckedChange={(v) => setBooking({ ...booking, contactConsent: v === true })}
            />
            PHANET may stay in touch with me after the event.
          </label>
        </Section>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {open && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <div>
            {existing &&
              (confirmCancel ? (
                <span className="flex items-center gap-2 text-sm">
                  Cancel the whole booking?
                  <Button type="button" variant="destructive" size="sm" onClick={cancel} disabled={isPending}>
                    Yes, cancel
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                    Keep it
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmCancel(true)}>
                  Cancel registration
                </Button>
              ))}
          </div>
          <Button type="submit" size="lg" disabled={isPending || rows.length === 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Save changes" : "Register"}
          </Button>
        </div>
      )}
    </form>
  );
}

function PersonCard({
  row,
  selfName,
  personFields,
  onChange,
  onRemove,
}: {
  row: FormRow;
  selfName: string;
  personFields: RegistrationField[];
  onChange: (patch: Partial<FormRow>) => void;
  onRemove: () => void;
}) {
  const k = row.key;
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">
          {row.kind === "self" ? `${selfName} (you)` : row.kind === "new" ? row.fullName || "New person" : row.label}
        </p>
        <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {row.kind === "new" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name *" id={`${k}-name`}>
            <Input
              id={`${k}-name`}
              value={row.fullName ?? ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </Field>
          <Field label="Gender *" id={`${k}-gender`}>
            <Pick
              id={`${k}-gender`}
              value={row.gender}
              onChange={(v) => onChange({ gender: v as "MALE" | "FEMALE" })}
              options={[
                ["MALE", "Male"],
                ["FEMALE", "Female"],
              ]}
            />
          </Field>
          <Field label="Phone" id={`${k}-phone`}>
            <Input
              id={`${k}-phone`}
              type="tel"
              value={row.phone ?? ""}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </Field>
          <Field label="Email" id={`${k}-email`}>
            <Input
              id={`${k}-email`}
              type="email"
              value={row.email ?? ""}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
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
          />
        </Field>
        <Field label="Food preference" id={`${k}-diet`}>
          <Pick
            id={`${k}-diet`}
            value={row.dietaryPreference}
            onChange={(v) => onChange({ dietaryPreference: v })}
            options={DIETARY_OPTIONS.map((o) => [o, o])}
          />
        </Field>
      </div>
      <Field label="Allergies" id={`${k}-allergies`}>
        <Input
          id={`${k}-allergies`}
          value={row.allergies}
          onChange={(e) => onChange({ allergies: e.target.value })}
          placeholder="e.g. peanuts, shellfish"
        />
      </Field>
      {personFields.map((f) => (
        <QuestionField
          key={f.id}
          idPrefix={k}
          field={f}
          value={row.answers[f.id]}
          onChange={(v) => onChange({ answers: { ...row.answers, [f.id]: v } })}
        />
      ))}
    </div>
  );
}

function QuestionField({
  field,
  idPrefix,
  value,
  onChange,
}: {
  field: RegistrationField;
  idPrefix: string;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  const id = `${idPrefix}-${field.id}`;
  const label = `${field.label}${field.required ? " *" : ""}`;
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
        {label}
      </label>
    );
  }
  const text = typeof value === "string" ? value : "";
  return (
    <Field label={label} id={id}>
      {field.type === "select" ? (
        <Pick id={id} value={text} onChange={onChange} options={field.options.map((o) => [o, o])} />
      ) : field.type === "textarea" ? (
        <Textarea id={id} rows={3} value={text} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          id={id}
          type={field.type === "date" ? "date" : "text"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-md border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Pick({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
