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
