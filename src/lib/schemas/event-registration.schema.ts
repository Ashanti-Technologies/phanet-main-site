import { z } from "zod";

export const eventTypeSchema = z.enum(["MEETING", "CAMP"]);

export const registrationFieldTypes = [
  "text",
  "textarea",
  "select",
  "checkbox",
  "date",
] as const;

/**
 * One admin-defined question on an event's registration form.
 * `id` is generated once and never changes, so stored answers survive
 * label edits. `scope` = asked once per booking, or for each attendee.
 */
export const registrationFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1, "Question label is required").max(200),
    type: z.enum(registrationFieldTypes),
    options: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    required: z.boolean().default(false),
    scope: z.enum(["booking", "person"]).default("booking"),
  })
  .refine((f) => f.type !== "select" || f.options.length > 0, {
    message: "Choice questions need at least one option",
    path: ["options"],
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

// ---------------------------------------------------------------------------
// Member-side registration
// ---------------------------------------------------------------------------

export const DIETARY_OPTIONS = [
  "No preference",
  "Vegetarian",
  "Vegan",
  "Halal",
  "No pork",
  "Diabetic-friendly",
  "Other (see allergies / notes)",
] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

const answersSchema = z
  .record(z.string(), z.union([z.string().max(2000), z.boolean()]))
  .default({});

const attendeeDetails = {
  dietaryPreference: optionalText(80),
  allergies: optionalText(1000),
  ageGroup: z.enum(["ADULT", "TEEN", "CHILD", "INFANT"]).optional(),
  answers: answersSchema,
};

/**
 * How the client identifies each attendee. The server never trusts a raw
 * memberId unless it can re-verify it (self, household, already on booking);
 * looked-up people are re-resolved from the contact the user typed.
 */
export const attendeeInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self"), ...attendeeDetails }),
  z.object({
    kind: z.literal("known"),
    memberId: z.string().min(1),
    relationship: z.enum(["SPOUSE", "CHILD", "GUEST"]),
    ...attendeeDetails,
  }),
  z.object({
    kind: z.literal("lookup"),
    contact: z.string().trim().min(3).max(200),
    relationship: z.enum(["SPOUSE", "CHILD", "GUEST"]),
    ...attendeeDetails,
  }),
  z.object({
    kind: z.literal("new"),
    fullName: z.string().trim().min(2, "Name is required").max(160),
    gender: z.enum(["MALE", "FEMALE"]),
    relationship: z.enum(["SPOUSE", "CHILD", "GUEST"]),
    phone: optionalText(40),
    email: z.email().trim().toLowerCase().optional().or(z.literal("").transform(() => undefined)),
    ...attendeeDetails,
    ageGroup: z.enum(["ADULT", "TEEN", "CHILD", "INFANT"]),
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
  arrivalDate: z.iso.date("Arrival date is required"),
  arrivalTime: optionalText(20),
  travelMode: z
    .enum(["PRIVATE_CAR", "PUBLIC_TRANSPORT", "ORGANISED_TRANSPORT", "FLIGHT", "OTHER"])
    .optional(),
  origin: optionalText(160),
  notes: optionalText(2000),
  contactConsent: z.boolean().default(false),
  answers: answersSchema,
  attendees: z.array(attendeeInputSchema).min(1, "Add at least one person").max(30),
});

export const createEventAccountSchema = z.object({
  eventSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Your name is required").max(160),
  email: z.email("Enter a valid email").trim().toLowerCase(),
});

export type AttendeeInput = z.input<typeof attendeeInputSchema>;
export type RegistrationSubmitInput = z.input<typeof registrationSubmitSchema>;

/**
 * Check answers against the event's questions for one scope. Unknown keys
 * are dropped; required questions must be answered; choices must be valid.
 */
export function validateAnswers(
  fields: RegistrationField[],
  scope: RegistrationField["scope"],
  answers: Record<string, string | boolean>,
): { ok: true; value: Record<string, string | boolean> } | { ok: false; error: string } {
  const value: Record<string, string | boolean> = {};
  for (const f of fields.filter((f) => f.scope === scope)) {
    const raw = answers[f.id];
    if (f.type === "checkbox") {
      if (f.required && raw !== true) return { ok: false, error: `"${f.label}" is required` };
      if (raw !== undefined) value[f.id] = raw === true;
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) {
      if (f.required) return { ok: false, error: `"${f.label}" is required` };
      continue;
    }
    if (f.type === "select" && !f.options.includes(text)) {
      return { ok: false, error: `Pick a valid option for "${f.label}"` };
    }
    value[f.id] = text;
  }
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Rooms (camp events, admin)
// ---------------------------------------------------------------------------

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
