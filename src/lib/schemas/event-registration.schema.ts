import { z } from "zod";

export const eventTypeSchema = z.enum(["MEETING", "CAMP"]);

export const registrationFieldTypes = [
  "text",
  "textarea",
  "number",
  "phone",
  "date",
  "time",
  "datetime",
  "select",
  "checkbox",
  "checkboxes",
  "switch",
  "location",
  "days",
  "nights",
] as const;

export type RegistrationFieldType = (typeof registrationFieldTypes)[number];

/** Types whose answers come from `options`. */
export const OPTION_FIELD_TYPES: readonly RegistrationFieldType[] = ["select", "checkboxes", "days", "nights"];

/**
 * Multi-pick of the event's days / nights. Options are generated from the
 * event dates on every save (`withEventDayOptions`), never typed. Asked per
 * booking, and again on each Guest's card (guests may come on other days).
 */
export const EVENT_DAY_TYPES: readonly RegistrationFieldType[] = ["days", "nights"];
export const isEventDayField = (f: { type: RegistrationFieldType }) => EVENT_DAY_TYPES.includes(f.type);

/** "Day 1 · Wed 30 Dec" … for days; "Wed 30 Dec" … (all but the last day) for nights. */
export function eventDayOptions(type: "days" | "nights", start: Date, end?: Date | null): string[] {
  const DAY = 86_400_000;
  const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const last = end ? Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) : first;
  const out: string[] = [];
  for (let t = first, i = 1; t <= last && i <= 31; t += DAY, i++) {
    const label = new Date(t).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    if (type === "days") out.push(`Day ${i} · ${label}`);
    else if (t < last) out.push(label);
  }
  return out;
}

/** Fill days/nights options from the event dates (call when saving an event). */
export function withEventDayOptions<T extends { type: RegistrationFieldType; options: string[] }>(
  fields: T[],
  start: Date,
  end?: Date | null,
): T[] {
  return fields.map((f) =>
    f.type === "days" || f.type === "nights" ? { ...f, options: eventDayOptions(f.type, start, end) } : f,
  );
}

/** Arrival time as a part of the day (the clock times give context). */
export const ARRIVAL_BLOCKS = [
  "Dawn (4am–6am)",
  "Morning (6am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–9pm)",
  "Midnight (9pm–4am)",
] as const;

/** "14:30" → "Afternoon (12pm–5pm)"; null when it isn't an HH:MM time. */
export function arrivalBlock(hhmm: string): (typeof ARRIVAL_BLOCKS)[number] | null {
  const m = /^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  if (h >= 4 && h < 6) return ARRIVAL_BLOCKS[0];
  if (h >= 6 && h < 12) return ARRIVAL_BLOCKS[1];
  if (h >= 12 && h < 17) return ARRIVAL_BLOCKS[2];
  if (h >= 17 && h < 21) return ARRIVAL_BLOCKS[3];
  return ARRIVAL_BLOCKS[4];
}

/**
 * One admin-defined question on an event's registration form.
 * `id` is generated once and never changes, so stored answers survive
 * label edits (and carry across events when a form is copied).
 * `scope` = asked once per booking, or for each attendee.
 * `summary` = show a breakdown / list on the admin Registrations tab.
 * `inPersonOnly` = skip for people following online (travel, food, …).
 */
export const registrationFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1, "Every question needs a label").max(200),
    type: z.enum(registrationFieldTypes),
    description: z.string().trim().max(300).optional(),
    placeholder: z.string().trim().max(120).optional(),
    options: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    min: z.number().optional(),
    max: z.number().optional(),
    required: z.boolean().default(false),
    scope: z.enum(["booking", "person"]).default("booking"),
    summary: z.boolean().default(false),
    inPersonOnly: z.boolean().optional(),
  })
  .refine((f) => !OPTION_FIELD_TYPES.includes(f.type) || isEventDayField(f) || f.options.length > 0, {
    message: "Choice questions need at least one option",
    path: ["options"],
  })
  .refine((f) => new Set(f.options).size === f.options.length, {
    message: "Options must be unique",
    path: ["options"],
  })
  .refine((f) => f.min === undefined || f.max === undefined || f.min <= f.max, {
    message: "Minimum can't be more than maximum",
    path: ["min"],
  });

export const eventRegistrationFieldsSchema = z
  .array(registrationFieldSchema)
  .max(40)
  .refine((fields) => new Set(fields.map((f) => f.id)).size === fields.length, {
    message: "Duplicate question ids",
  });

export type RegistrationField = z.infer<typeof registrationFieldSchema>;

/** Read the Json column safely; bad/legacy data yields no questions. */
export function parseRegistrationFields(value: unknown): RegistrationField[] {
  return eventRegistrationFieldsSchema.safeParse(value ?? []).data ?? [];
}

export const DIETARY_OPTIONS = [
  "No preference",
  "Vegetarian",
  "Vegan",
  "Halal",
  "No pork",
  "Diabetic-friendly",
  "Other (see allergies / notes)",
] as const;

/**
 * Starting form for new events. The ids are fixed: the
 * registration_form_builder migration moved the old hard-coded columns into
 * answers under these keys, and the register page pre-fills person answers
 * from earlier events by id. Keep them in sync with that migration.
 */
export const DEFAULT_REGISTRATION_FIELDS: RegistrationField[] = [
  { id: "arrival_date", inPersonOnly: true, label: "Arrival date", type: "date", required: true, scope: "booking", summary: true, options: [] },
  { id: "arrival_time", inPersonOnly: true, label: "Arrival time", type: "select", required: false, scope: "booking", summary: true, options: [...ARRIVAL_BLOCKS] },
  {
    id: "travel_mode",
    label: "Travelling by",
    type: "select",
    required: false,
    scope: "booking",
    summary: true,
    inPersonOnly: true,
    options: ["Private car", "Public transport", "Church / organised transport", "Flight", "Other"],
  },
  { id: "food", inPersonOnly: true, label: "Food preference", type: "select", required: false, scope: "person", summary: true, options: [...DIETARY_OPTIONS] },
  { id: "allergies", inPersonOnly: true, label: "Allergies", type: "text", placeholder: "e.g. peanuts, shellfish", required: false, scope: "person", summary: true, options: [] },
  { id: "notes", label: "Notes for the organisers", type: "textarea", required: false, scope: "booking", summary: false, options: [] },
  { id: "contact_consent", label: "PHANET may stay in touch with me after the event.", type: "checkbox", required: false, scope: "booking", summary: false, options: [] },
];

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export type AnswerValue = string | number | boolean | string[];
export type Answers = Record<string, AnswerValue>;

const PATTERNS: Partial<Record<RegistrationFieldType, [RegExp, string]>> = {
  phone: [/^[+\d][\d\s()-]{6,19}$/, "Enter a valid phone number"],
  date: [/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"],
  time: [/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time"],
  datetime: [/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Enter a date and time"],
};

/**
 * Check one answer against its question. Shared by the browser (inline
 * errors) and the server (source of truth), so both agree on every rule.
 * `value: undefined` = not answered, so nothing is stored.
 */
export function checkAnswer(
  f: RegistrationField,
  raw: AnswerValue | undefined,
): { ok: true; value: AnswerValue | undefined } | { ok: false; error: string } {
  const ok = (value: AnswerValue | undefined) => ({ ok: true as const, value });
  const err = (error: string) => ({ ok: false as const, error });

  switch (f.type) {
    case "checkbox":
      if (f.required && raw !== true) return err("Please tick this box");
      return ok(raw === undefined ? undefined : raw === true);
    case "switch":
      // Off is a valid answer, so a switch can't be "required".
      return ok(raw === true);
    case "checkboxes":
    case "days":
    case "nights": {
      const picked = Array.isArray(raw) ? raw : [];
      if (picked.some((v) => !f.options.includes(v))) return err("Pick from the listed options");
      if (!picked.length) return f.required ? err("Pick at least one") : ok(undefined);
      return ok(f.options.filter((o) => picked.includes(o))); // de-duped, in option order
    }
    case "number": {
      const text = raw === undefined ? "" : String(raw).trim();
      if (!text) return f.required ? err("This is required") : ok(undefined);
      const n = Number(text);
      if (!Number.isFinite(n)) return err("Enter a number");
      if (f.min !== undefined && n < f.min) return err(`Must be at least ${f.min}`);
      if (f.max !== undefined && n > f.max) return err(`Must be at most ${f.max}`);
      return ok(n);
    }
    case "location": {
      // [city, region, country] names from the location picker.
      if (raw !== undefined && !(Array.isArray(raw) && raw.length === 3)) return err("Pick a location");
      const [city, region, country] = (raw ?? ["", "", ""]).map((v) => String(v).trim());
      if (!city) return f.required ? err("Enter your town or city") : ok(undefined);
      if (!country) return err("Pick a country");
      if ([city, region, country].some((v) => v.length > 100)) return err("That's too long");
      return ok([city, region, country]);
    }
    default: {
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return f.required ? err("This is required") : ok(undefined);
      if (text.length > 2000) return err("That's too long");
      if (f.type === "select" && !f.options.includes(text)) return err("Pick one of the options");
      const pattern = PATTERNS[f.type];
      if (pattern && !pattern[0].test(text)) return err(pattern[1]);
      return ok(text);
    }
  }
}

/**
 * Questions asked for one scope. `inPerson` = the person (or, for booking
 * questions, anyone on the booking) is attending in person.
 */
export function fieldsFor(
  fields: RegistrationField[],
  scope: RegistrationField["scope"],
  inPerson: boolean,
  /** A Guest's card also asks the booking's days/nights questions for them. */
  guest = false,
) {
  const asked = (f: RegistrationField) => inPerson || !f.inPersonOnly;
  return [
    ...fields.filter((f) => f.scope === scope && asked(f)),
    ...(scope === "person" && guest
      ? fields
          .filter((f) => f.scope === "booking" && isEventDayField(f) && asked(f))
          .map((f) => ({ ...f, description: "Fill this in for your guest." }))
      : []),
  ];
}

/**
 * Check answers against the event's questions for one scope. Unknown keys
 * (and skipped in-person-only answers) are dropped; returns the first
 * problem, prefixed with the question label.
 */
export function validateAnswers(
  fields: RegistrationField[],
  scope: RegistrationField["scope"],
  answers: Answers,
  inPerson = true,
  guest = false,
): { ok: true; value: Answers } | { ok: false; error: string } {
  const value: Answers = {};
  for (const f of fieldsFor(fields, scope, inPerson, guest)) {
    const res = checkAnswer(f, answers[f.id]);
    if (!res.ok) return { ok: false, error: `${f.label}: ${res.error}` };
    if (res.value !== undefined) value[f.id] = res.value;
  }
  return { ok: true, value };
}

/** A person's answer to one field (booking answers are shared by everyone on the booking). */
export function fieldAnswer(
  row: { personAnswers: Answers; bookingAnswers: Answers },
  field: RegistrationField,
): AnswerValue | undefined {
  // Guests answer days/nights for themselves; everyone else shares the booking's answer.
  if (isEventDayField(field)) return row.personAnswers[field.id] ?? row.bookingAnswers[field.id];
  return (field.scope === "person" ? row.personAnswers : row.bookingAnswers)[field.id];
}

/** Human-readable answer for tables, summaries and CSV. */
export function answerText(value: AnswerValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value.replace("T", " ");
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Member-side registration
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

const answersSchema = z
  .record(
    z.string(),
    z.union([
      z.string().max(2000),
      z.number(),
      z.boolean(),
      z.array(z.string().max(100)).max(100),
    ]),
  )
  .default({});

const idText = z.string().trim().max(64).optional().nullable().transform((v) => v || null);

/** Where a person is. Ids are re-checked on the server (resolveMemberLocation). */
export const attendeeLocationSchema = z.object({
  countryId: z.string().trim().min(1, "Pick a country").max(64),
  regionId: idText,
  cityId: idText,
  city: z.string().trim().min(1, "Enter a town or city").max(100),
});

export const ATTENDANCE_MODES = ["IN_PERSON", "ONLINE"] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];

const attendeeDetails = {
  ageGroup: z.enum(["ADULT", "TEEN", "CHILD", "INFANT"], { error: "Pick an age group" }),
  /** Event price tier; re-priced on the server, never trusted for the amount. */
  priceTierId: z.string().min(1).optional(),
  attendance: z.enum(ATTENDANCE_MODES).default("IN_PERSON"),
  location: attendeeLocationSchema,
  answers: answersSchema,
};

/**
 * How the client identifies each attendee. The server never trusts a raw
 * memberId unless it can re-verify it (self, household, past bookings, already on booking);
 * looked-up people are re-resolved from the contact the user typed.
 */
/** Who an added attendee is to the registrant. Only SPOUSE/CHILD join their household. */
export const ATTENDEE_RELATIONSHIPS = ["SPOUSE", "CHILD", "RELATIVE", "GUEST"] as const;

export const attendeeInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self"), ...attendeeDetails }),
  z.object({
    kind: z.literal("known"),
    memberId: z.string().min(1),
    relationship: z.enum(ATTENDEE_RELATIONSHIPS),
    ...attendeeDetails,
  }),
  z.object({
    kind: z.literal("lookup"),
    contact: z.string().trim().min(3).max(200),
    relationship: z.enum(ATTENDEE_RELATIONSHIPS),
    ...attendeeDetails,
  }),
  z.object({
    kind: z.literal("new"),
    fullName: z.string().trim().min(2, "Name is required").max(160),
    gender: z.enum(["MALE", "FEMALE"]),
    relationship: z.enum(ATTENDEE_RELATIONSHIPS),
    phone: optionalText(40),
    email: z.email().trim().toLowerCase().optional().or(z.literal("").transform(() => undefined)),
    ...attendeeDetails,
  }),
]);

export const registrationSubmitSchema = z.object({
  eventId: z.string().min(1),
  /** Only used when the signed-in user has no person record yet. */
  self: z
    .object({
      fullName: z.string().trim().min(2, "Your name is required").max(160),
      phone: optionalText(40),
      gender: z.enum(["MALE", "FEMALE"]).optional(),
    })
    .optional(),
  answers: answersSchema,
  attendees: z.array(attendeeInputSchema).min(1, "Add at least one person").max(30),
});

export const createEventAccountSchema = z.object({
  eventSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Your name is required").max(160),
  email: z.email("Enter a valid email").trim().toLowerCase(),
});

/** Form progress. `data` is the form's own state, only ever read back by the form. */
export const registrationDraftSchema = z.object({
  step: z.enum(["you", "people", "details", "review"]),
  data: z
    .record(z.string(), z.unknown())
    .refine((d) => JSON.stringify(d).length <= 64_000, "Draft too large"),
});
export type RegistrationDraftInput = z.input<typeof registrationDraftSchema>;

export type AttendeeInput = z.input<typeof attendeeInputSchema>;
export type RegistrationSubmitInput = z.input<typeof registrationSubmitSchema>;

// ---------------------------------------------------------------------------
// Rooms (camp events, admin)
// ---------------------------------------------------------------------------

export const eventPaymentInputSchema = z.object({
  amount: z.coerce.number().positive("Enter the amount received").max(1_000_000),
  method: z.enum(["CASH", "MOMO", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]),
  reference: z.string().trim().max(120).optional().transform((v) => v || undefined),
});

export const roomTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
});

export const roomInputSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(80),
  beds: z.coerce.number().int().min(1, "At least 1 bed").max(500),
  gender: z
    .enum(["MALE", "FEMALE", ""])
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Bulk add: quantity > 1 creates "<name> 1" … "<name> n". */
export const roomsCreateSchema = roomInputSchema.extend({
  quantity: z.coerce.number().int().min(1).max(200).default(1),
});
