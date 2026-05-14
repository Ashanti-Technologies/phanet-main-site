import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

export const memberApplicationSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(1, "Phone is required").max(80),
  email: z
    .string()
    .trim()
    .email("Valid email is required")
    .max(200)
    .transform((value) => value.toLowerCase()),
  unitId: optionalString,
  intro: z.string().trim().min(1, "Brief introduction is required").max(1500),
});

export const memberApprovalSchema = z.object({
  memberId: z.string().min(1),
});

export const memberInviteSendSchema = z.object({
  memberId: z.string().min(1),
});

export const memberInviteAcceptSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const memberProfileUpdateSchema = z.object({
  // About you
  preferredName: optionalString,
  occupation: optionalString,
  dob: optionalDate,
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"])
    .optional()
    .nullable(),

  // Contact & address
  phone: optionalString,
  whatsapp: optionalString,
  addressLine: optionalString,
  city: optionalString,
  countryId: optionalString,
  regionId: optionalString,
  region: optionalString,
  country: z.string().trim().default("Ghana").optional().nullable(),

  // PHANET profile
  emergencyContactName: optionalString,
  emergencyContactPhone: optionalString,
  lifeStage: z
    .enum(["WORKING_PROFESSIONAL", "TERTIARY_STUDENT", "SHS_STUDENT"])
    .optional()
    .nullable(),
  regionalChapter: z
    .enum([
      "GREATER_ACCRA",
      "ASHANTI",
      "DIASPORA",
      "NORTHERN",
      "CENTRAL_NORTH",
      "CENTRAL_SOUTH",
      "NORTH_EAST",
      "BONO",
      "EASTERN",
      "WESTERN",
    ])
    .optional()
    .nullable(),
  professionalTrack: z
    .enum(["EMPLOYED", "SELF_EMPLOYED", "STUDYING_OVERSEAS"])
    .optional()
    .nullable(),
  organizationName: optionalString,
});

export const memberNotificationsUpdateSchema = z.object({
  notifyByEmail: z.coerce.boolean(),
  notifyBySms: z.coerce.boolean(),
});

export const eventRsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["GOING", "CANCELLED"]),
});

export type MemberApplicationInput = z.input<typeof memberApplicationSchema>;
export type MemberApprovalInput = z.input<typeof memberApprovalSchema>;
export type MemberInviteSendInput = z.input<typeof memberInviteSendSchema>;
export type MemberInviteAcceptInput = z.input<typeof memberInviteAcceptSchema>;
export type MemberProfileUpdateInput = z.input<typeof memberProfileUpdateSchema>;
export type MemberNotificationsUpdateInput = z.input<
  typeof memberNotificationsUpdateSchema
>;
export type EventRsvpInput = z.input<typeof eventRsvpSchema>;
