"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import {
  cancelEventRegistration,
  findPersonForRegistration,
  submitEventRegistration,
} from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
  type StepperProps,
} from "@/app/components/ui/stepper";
import { RegistrationFieldInput } from "@/app/components/registration-field";
import { EMPTY_LOCATION, LocationInput, type LocationValue } from "@/app/components/location-input";
import {
  answerText,
  checkAnswer,
  fieldsFor,
  type AnswerValue,
  type Answers,
  type AttendanceMode,
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
  attendance: AttendanceMode;
  location: LocationValue;
  /** Travelling from the registrant's place (their own `location` is then ignored). */
  sameAsMe?: boolean;
  /** The person ticked/unticked "same place" themselves, so relationship changes leave it alone. */
  sameTouched?: boolean;
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
    /** People may choose to follow online (free, no travel/food questions). */
    allowOnline: boolean;
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
  /** Profile location per member id, to pre-fill. */
  locations: Record<string, LocationValue>;
  existing: { rows: FormRow[]; answers: Answers } | null;
};

type StepId = "you" | "people" | "details" | "review";
const STEP_TITLES: Record<StepId, string> = {
  you: "You",
  people: "Who's coming",
  details: "Details",
  review: "Review",
};

const RELATIONSHIPS: [Relationship, string][] = [
  ["SPOUSE", "Spouse"],
  ["CHILD", "Child"],
  ["RELATIVE", "Relative"],
  ["GUEST", "Guest"],
];
const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  SELF: "You",
  SPOUSE: "Spouse",
  CHILD: "Child",
  RELATIVE: "Relative",
  GUEST: "Guest",
};
const GENDERS: [string, string][] = [
  ["MALE", "Male"],
  ["FEMALE", "Female"],
];
const ATTENDANCE: [AttendanceMode, string][] = [
  ["IN_PERSON", "In person"],
  ["ONLINE", "Online"],
];
const AGE_GROUPS: [AgeGroup, string][] = [
  ["ADULT", "Adult (18+)"],
  ["TEEN", "Teen (13–17)"],
  ["CHILD", "Child (3–12)"],
  ["INFANT", "Infant (0–2)"],
];

const cedis = (n: number) =>
  n === 0 ? "Free" : `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Mirrors the server: online is free; people keep their booked price while their tier is unchanged. */
function rowPrice(row: FormRow, tiers: PriceTier[]) {
  if (row.attendance === "ONLINE") return 0;
  if (row.booked && row.booked.priceTierId === row.priceTierId && row.booked.amount != null) {
    return row.booked.amount;
  }
  return tiers.find((t) => t.id === row.priceTierId)?.amount ?? 0;
}

const locationDone = (l: LocationValue) => !!l.countryId && !!l.city.trim();
const locationText = (l: LocationValue) => [l.city, l.region, l.country].filter(Boolean).join(", ");
const sameLocation = (a: LocationValue, b: LocationValue) =>
  a.countryId === b.countryId &&
  (a.regionId ?? "") === (b.regionId ?? "") &&
  (a.cityId ?? "") === (b.cityId ?? "") &&
  a.city.trim().toLowerCase() === b.city.trim().toLowerCase();
/** Spouses and children usually travel with the registrant; guests and relatives often don't. */
const travelsWithMe = (rel: Relationship) => rel === "SPOUSE" || rel === "CHILD";

export function RegistrationForm(props: Props) {
  const { event, open, me, household, previous, locations, existing } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** Inline errors, keyed by the field's DOM id. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Where the registrant travels from: everyone ticked "same place" copies it.
  const initialMyLocation =
    existing?.rows.find((r) => r.kind === "self")?.location ?? (me && locations[me.id]) ?? EMPTY_LOCATION;
  const [myLocation, setMyLocation] = useState<LocationValue>(initialMyLocation);

  const blank = (memberId: string | undefined, relationship: Relationship) => {
    const profile = memberId ? locations[memberId] : undefined;
    return {
      answers: (memberId && previous[memberId]) || {},
      attendance: "IN_PERSON" as const,
      location: profile ?? EMPTY_LOCATION,
      sameAsMe:
        relationship !== "SELF" &&
        travelsWithMe(relationship) &&
        (!profile || sameLocation(profile, myLocation)),
    };
  };

  const [self, setSelf] = useState({
    fullName: props.sessionUser.name,
    phone: "",
    gender: undefined as "MALE" | "FEMALE" | undefined,
  });
  const [rows, setRows] = useState<FormRow[]>(() =>
    existing
      ? existing.rows.map((r) => ({
          ...r,
          sameAsMe: r.kind !== "self" && sameLocation(r.location, initialMyLocation),
        }))
      : [
          {
            key: "self",
            kind: "self",
            label: me?.fullName ?? "You",
            memberId: me?.id,
            relationship: "SELF",
            ...blank(me?.id, "SELF"),
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
  const anyoneInPerson = rows.length === 0 || rows.some((r) => r.attendance === "IN_PERSON");
  const onlineCount = rows.filter((r) => r.attendance === "ONLINE").length;
  const bookingFields = fieldsFor(event.fields, "booking", anyoneInPerson);
  const personFieldsFor = (r: FormRow) => fieldsFor(event.fields, "person", r.attendance === "IN_PERSON");
  const addableHousehold = household.filter(
    (h) => !rows.some((r) => r.memberId === h.id),
  );
  const myName = me?.fullName ?? (self.fullName || "You");
  const personName = (r: FormRow) =>
    r.kind === "self" ? myName : r.kind === "new" ? r.fullName || "New person" : r.label;
  /** Where this person travels from, after "same place as me". */
  const placeOf = (r: FormRow) => (r.kind === "self" || r.sameAsMe ? myLocation : r.location);

  const steps: StepId[] = ["you", "people", ...(bookingFields.length ? (["details"] as const) : []), "review"];
  const [step, setStep] = useState<StepId>("you");
  const stepIndex = Math.max(0, steps.indexOf(step));

  const updateRow = (key: string, patch: Partial<FormRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const clearFieldError = (domId: string) =>
    setFieldErrors((e) => {
      if (!(domId in e)) return e;
      const { [domId]: _, ...rest } = e;
      return rest;
    });

  /** One step's problems: a summary message plus inline errors (DOM id → message). Same rules as the server. */
  function checkStep(s: StepId) {
    const fields: Record<string, string> = {};
    let message: string | null = null;
    const check = (domId: string, f: RegistrationField, v: AnswerValue | undefined) => {
      const res = checkAnswer(f, v);
      if (!res.ok) fields[domId] = res.error;
    };
    if (s === "you") {
      if (!me && self.fullName.trim().length < 2) fields["self-name"] = "Please enter your name";
      if (!locationDone(myLocation)) fields["me-location"] = "Pick your country, region and town";
    }
    if (s === "people") {
      if (rows.length === 0) message = "Add at least one person, or tick “I'm attending” on the first step.";
      for (const r of rows) {
        const k = r.key;
        if (r.kind === "new") {
          if (!r.fullName?.trim()) fields[`${k}-name`] = "Enter their name";
          if (!r.gender) fields[`${k}-gender`] = "Pick one";
          if (!r.ageGroup) fields[`${k}-age`] = "Pick an age group";
        }
        if (charges && r.attendance === "IN_PERSON" && !r.priceTierId) fields[`${k}-price`] = "Pick a price";
        if (!locationDone(placeOf(r))) fields[`${k}-location`] = "Pick a country, region and town";
        for (const f of personFieldsFor(r)) check(`${k}-${f.id}`, f, r.answers[f.id]);
      }
    }
    if (s === "details") {
      for (const f of bookingFields) check(`booking-${f.id}`, f, answers[f.id]);
    }
    if (!message && Object.keys(fields).length) message = "Please fix the highlighted questions.";
    return { message, fields };
  }

  /** Show a step's problems and focus the first one. Returns true when the step is fine. */
  function validate(s: StepId) {
    const { message, fields } = checkStep(s);
    setFieldErrors(fields);
    setError(message);
    const firstId = Object.keys(fields)[0];
    if (firstId) {
      // After the step renders (it may have just been switched to).
      setTimeout(() => {
        const wrapper = document.querySelector(`[data-field-id="${CSS.escape(firstId)}"]`);
        wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });
        wrapper?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
      }, 50);
    }
    return !message;
  }

  /** Going forward checks every step in between; going back never blocks. */
  const onValidate: NonNullable<StepperProps["onValidate"]> = (target, direction) => {
    if (direction === "prev") return true;
    const to = steps.indexOf(target as StepId);
    for (const s of steps.slice(stepIndex, to)) {
      if (!validate(s)) {
        setStep(s);
        return false;
      }
    }
    setError(null);
    return true;
  };

  function goNext() {
    if (!validate(step)) return;
    setStep(steps[stepIndex + 1] ?? step);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        ...blank(me?.id, "SELF"),
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
    for (const s of steps) {
      if (!validate(s)) return setStep(s);
    }

    const attendees: AttendeeInput[] = rows.map((r) => {
      const online = r.attendance === "ONLINE";
      const { countryId, regionId, cityId, city } = placeOf(r);
      const details = {
        ageGroup: r.ageGroup,
        priceTierId: charges && !online ? r.priceTierId : undefined,
        attendance: r.attendance,
        location: { countryId: countryId ?? "", regionId, cityId, city },
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
    // Enter in a field moves to the next step; only the Review step submits.
    <form action={() => (step === "review" ? submit() : goNext())} className="space-y-5" aria-busy={isPending}>
      {!open && (
        <p className="rounded-2xl border bg-muted p-4 text-sm">
          Registration has closed, so your booking can no longer be changed.
          Contact the organisers if something is wrong.
        </p>
      )}

      <Stepper value={step} onValueChange={(v) => setStep(v as StepId)} onValidate={onValidate}>
        <StepperList className="mb-5">
          {steps.map((s) => (
            <StepperItem key={s} value={s} completed={!!existing}>
              <StepperTrigger className="gap-2">
                <StepperIndicator />
                <StepperTitle className="hidden text-sm sm:block">{STEP_TITLES[s]}</StepperTitle>
              </StepperTrigger>
              <StepperSeparator className="mx-2" />
            </StepperItem>
          ))}
        </StepperList>

        <fieldset disabled={!open || isPending} className="space-y-5">
          <StepperContent value="you">
            <Section title="You">
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
                  <Field label="Full name *" id="self-name" error={fieldErrors["self-name"]}>
                    <Input
                      id="self-name"
                      value={self.fullName}
                      onChange={(e) => {
                        setSelf({ ...self, fullName: e.target.value });
                        clearFieldError("self-name");
                      }}
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
              <div className="space-y-2" data-field-id="me-location">
                <Label htmlFor="me-location">
                  {rows.find((r) => r.kind === "self")?.attendance === "ONLINE"
                    ? "Where are you based? *"
                    : "Where are you travelling from? *"}
                </Label>
                <LocationInput
                  id="me-location"
                  value={myLocation}
                  invalid={!!fieldErrors["me-location"]}
                  onChange={(l) => {
                    setMyLocation(l);
                    clearFieldError("me-location");
                  }}
                />
                {fieldErrors["me-location"] && (
                  <p className="text-sm text-destructive">{fieldErrors["me-location"]}</p>
                )}
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <Checkbox checked={attending} onCheckedChange={(v) => toggleSelf(v === true)} />
                I&apos;m attending this event
              </label>
            </Section>
          </StepperContent>

          <StepperContent value="people">
            <Section title="Who's coming" hint="Everyone on this booking, including children.">
              <div className="space-y-3">
                {rows.map((row) => (
                  <PersonCard
                    key={row.key}
                    row={row}
                    name={personName(row)}
                    myPlace={locationText(myLocation)}
                    personFields={personFieldsFor(row)}
                    allowOnline={event.allowOnline}
                    tiers={event.tiers}
                    fieldErrors={fieldErrors}
                    onAnswer={(fieldId, v) => {
                      updateRow(row.key, { answers: { ...row.answers, [fieldId]: v } });
                      clearFieldError(`${row.key}-${fieldId}`);
                    }}
                    onChange={(patch) => {
                      updateRow(row.key, patch);
                      for (const f of Object.keys(patch)) {
                        const id = { fullName: "name", gender: "gender", ageGroup: "age", priceTierId: "price", location: "location", sameAsMe: "location" }[f];
                        if (id) clearFieldError(`${row.key}-${id}`);
                      }
                    }}
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
                              ...blank(h.id, h.relationship),
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
                        // Enter searches instead of moving to the next step.
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
                            ...blank(undefined, "GUEST"),
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
                      ...blank(undefined, "CHILD"),
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add someone new
                </Button>
              </div>
            </Section>
          </StepperContent>

          {/* The event's own questions (built in the admin form builder) */}
          {bookingFields.length > 0 && (
            <StepperContent value="details">
              <Section title="A few more details">
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
            </StepperContent>
          )}

          <StepperContent value="review">
            <Section title="Review your booking" hint="Check everything, then confirm.">
              <ReviewBlock title="Who's coming" onEdit={() => setStep("people")}>
                <ul className="divide-y rounded-xl border">
                  {rows.map((r) => (
                    <li key={r.key} className="space-y-1 p-4 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{personName(r)}</span>
                        {charges && (
                          <span className="font-mono tabular-nums">{cedis(rowPrice(r, event.tiers))}</span>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {[
                          RELATIONSHIP_LABEL[r.relationship],
                          AGE_GROUPS.find(([v]) => v === r.ageGroup)?.[1],
                          event.allowOnline && ATTENDANCE.find(([v]) => v === r.attendance)?.[1],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        {locationText(placeOf(r)) || "No location"}
                      </p>
                      {personFieldsFor(r)
                        .filter((f) => answerText(r.answers[f.id]))
                        .map((f) => (
                          <p key={f.id} className="text-muted-foreground">
                            {f.label}: <span className="text-foreground">{answerText(r.answers[f.id])}</span>
                          </p>
                        ))}
                    </li>
                  ))}
                </ul>
              </ReviewBlock>
              {bookingFields.some((f) => answerText(answers[f.id])) && (
                <ReviewBlock title="Details" onEdit={() => setStep("details")}>
                  <dl className="space-y-1 rounded-xl border p-4 text-sm">
                    {bookingFields
                      .filter((f) => answerText(answers[f.id]))
                      .map((f) => (
                        <div key={f.id}>
                          <dt className="inline text-muted-foreground">{f.label}: </dt>
                          <dd className="inline">{answerText(answers[f.id])}</dd>
                        </div>
                      ))}
                  </dl>
                </ReviewBlock>
              )}
            </Section>
          </StepperContent>
        </fieldset>

        {open && (
          <>
            {/* Thumb-zone action bar: stays in view on phones while scrolling. */}
            <div className="sticky bottom-0 z-20 -mx-4 mt-5 space-y-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-card sm:p-4">
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
                  {onlineCount > 0 && <> ({onlineCount} online)</>}
                  {charges && (
                    <>
                      {" · "}
                      <span className="font-semibold text-foreground tabular-nums">{cedis(total)}</span>
                      {event.amountPaid > 0 && toPay > 0 && <> ({cedis(toPay)} to pay)</>}
                      {event.paymentMode === "PAY_AT_EVENT" && toPay > 0 && <> at the event</>}
                    </>
                  )}
                </p>
                {stepIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12"
                    onClick={() => {
                      setError(null);
                      setStep(steps[stepIndex - 1]);
                    }}
                    disabled={isPending}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                )}
                {step === "review" ? (
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 flex-1 sm:flex-none sm:px-8"
                    disabled={isPending || rows.length === 0}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {paysOnline ? "Continue to payment" : existing ? "Save changes" : "Complete registration"}
                  </Button>
                ) : (
                  <Button type="submit" size="lg" className="h-12 flex-1 sm:flex-none sm:px-8">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
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
      </Stepper>
    </form>
  );
}

function PersonCard({
  row,
  name,
  myPlace,
  personFields,
  allowOnline,
  tiers,
  fieldErrors,
  onAnswer,
  onChange,
  onRemove,
}: {
  row: FormRow;
  name: string;
  /** The registrant's place, shown next to "same place as me". */
  myPlace: string;
  personFields: RegistrationField[];
  allowOnline: boolean;
  tiers: PriceTier[];
  fieldErrors: Record<string, string>;
  onAnswer: (fieldId: string, value: AnswerValue) => void;
  onChange: (patch: Partial<FormRow>) => void;
  onRemove: () => void;
}) {
  const k = row.key;
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
          <Field label="Full name *" id={`${k}-name`} className="sm:col-span-2" error={fieldErrors[`${k}-name`]}>
            <Input
              id={`${k}-name`}
              value={row.fullName ?? ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Gender *" id={`${k}-gender`} className="sm:col-span-2" error={fieldErrors[`${k}-gender`]}>
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
            onChange={(v) => {
              const relationship = v as Relationship;
              onChange(row.sameTouched ? { relationship } : { relationship, sameAsMe: travelsWithMe(relationship) });
            }}
            options={RELATIONSHIPS}
          />
        </Field>
      )}
      <Field label={row.kind === "new" ? "Age group *" : "Age group"} id={`${k}-age`} error={fieldErrors[`${k}-age`]}>
        <Pick
          id={`${k}-age`}
          value={row.ageGroup}
          onChange={(v) => onChange({ ageGroup: v as AgeGroup })}
          options={AGE_GROUPS}
          columns={2}
        />
      </Field>
      {allowOnline && (
        <Field label="Attending" id={`${k}-attendance`}>
          <Pick
            id={`${k}-attendance`}
            value={row.attendance}
            onChange={(v) => onChange({ attendance: v as AttendanceMode })}
            options={ATTENDANCE}
            columns={2}
          />
          {row.attendance === "ONLINE" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Free. We&apos;ll share the stream links before each session.
            </p>
          )}
        </Field>
      )}
      {row.kind !== "self" && (
        <div className="space-y-3" data-field-id={`${k}-location`}>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={!!row.sameAsMe}
              onCheckedChange={(v) => onChange({ sameAsMe: v === true, sameTouched: true })}
            />
            <span>
              <span className="font-medium">
                {row.attendance === "ONLINE" ? "Based in the same place as me" : "Travelling from the same place as me"}
              </span>
              {myPlace && <span className="block text-xs text-muted-foreground">{myPlace}</span>}
            </span>
          </label>
          {!row.sameAsMe && (
            <div className="space-y-2">
              <Label htmlFor={`${k}-location`}>
                {row.attendance === "ONLINE" ? `Where is ${name} based? *` : `Where is ${name} travelling from? *`}
              </Label>
              <LocationInput
                id={`${k}-location`}
                value={row.location}
                invalid={!!fieldErrors[`${k}-location`]}
                onChange={(location) => onChange({ location })}
              />
            </div>
          )}
          {fieldErrors[`${k}-location`] && (
            <p className="text-sm text-destructive">{fieldErrors[`${k}-location`]}</p>
          )}
        </div>
      )}
      {tiers.length > 0 && row.attendance === "IN_PERSON" && (
        <Field label="Price *" id={`${k}-price`} error={fieldErrors[`${k}-price`]}>
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

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {children}
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
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="space-y-0.5">
        <h2 className="text-lg font-semibold leading-7">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  className,
  error,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`} data-field-id={id}>
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
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
