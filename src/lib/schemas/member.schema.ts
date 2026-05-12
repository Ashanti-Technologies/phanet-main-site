import { z } from "zod";

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

export const memberBaseFields = {
  fullName: z.string().trim().min(1, "Name is required").max(200),
  preferredName: optionalString,
  dob: optionalDate,
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"])
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: optionalString,
  whatsapp: optionalString,
  addressLine: optionalString,
  city: optionalString,
  region: optionalString,
  country: z.string().trim().default("Ghana").optional().nullable(),
  occupation: optionalString,
  photoUrl: optionalString,
  photoPublicId: optionalString,
  salvationDate: optionalDate,
  baptismDate: optionalDate,
  weddingAnniversary: optionalDate,
  joinDate: optionalDate,
  status: z
    .enum([
      "VISITOR",
      "PENDING_APPROVAL",
      "REGULAR",
      "MEMBER",
      "INACTIVE",
      "TRANSFERRED",
      "DECEASED",
    ])
    .default("VISITOR"),
  notes: optionalString,
  notifyByEmail: z.coerce.boolean().default(true),
  notifyBySms: z.coerce.boolean().default(true),
  householdId: optionalString,
  unitIds: z.array(z.string().min(1)).default([]),
  tagIds: z.array(z.string().min(1)).default([]),
};

export const memberCreateSchema = z.object(memberBaseFields);
export const memberUpdateSchema = z
  .object({ id: z.string().min(1) })
  .extend(memberBaseFields);

export type MemberCreateInput = z.input<typeof memberCreateSchema>;
export type MemberUpdateInput = z.input<typeof memberUpdateSchema>;

export const memberListFilterSchema = z.object({
  q: z.string().trim().optional(),
  unitId: z.string().optional(),
  tagId: z.string().optional(),
  status: z
    .enum([
      "VISITOR",
      "PENDING_APPROVAL",
      "REGULAR",
      "MEMBER",
      "INACTIVE",
      "TRANSFERRED",
      "DECEASED",
    ])
    .optional(),
  ageBucket: z.enum(["under18", "18-29", "30-49", "50-69", "70plus"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type MemberListFilter = z.infer<typeof memberListFilterSchema>;

export const tagCreateSchema = z.object({
  label: z.string().trim().min(1).max(60),
  color: optionalString,
});

export const tagUpdateSchema = tagCreateSchema.extend({
  id: z.string().min(1),
});

export type TagCreateInput = z.input<typeof tagCreateSchema>;
export type TagUpdateInput = z.input<typeof tagUpdateSchema>;

export const householdCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  addressLine: optionalString,
  city: optionalString,
  region: optionalString,
  notes: optionalString,
});

export const householdUpdateSchema = householdCreateSchema.extend({
  id: z.string().min(1),
});

export type HouseholdCreateInput = z.input<typeof householdCreateSchema>;
export type HouseholdUpdateInput = z.input<typeof householdUpdateSchema>;
