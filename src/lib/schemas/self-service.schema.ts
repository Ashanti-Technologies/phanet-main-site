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

export const memberProfileUpdateSchema = z.object({
  preferredName: optionalString,
  phone: optionalString,
  whatsapp: optionalString,
  addressLine: optionalString,
  city: optionalString,
  region: optionalString,
  country: z.string().trim().default("Ghana").optional().nullable(),
  occupation: optionalString,
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
