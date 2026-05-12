import { z } from "zod";

export const adminUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

export const prayerRequestUpdateSchema = z.object({
  id: z.cuid(),
  status: z.enum(["NEW", "IN_PRAYER", "PRAYED", "ARCHIVED"]),
  adminNote: z.string().trim().optional(),
});

export const manualFinanceUpdateSchema = z.object({
  id: z.cuid(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
  confirmedAmount: z.coerce.number().positive().optional().nullable(),
  confirmedAt: z.coerce.date().optional().nullable(),
  paymentNote: z.string().trim().optional(),
  internalNote: z.string().trim().optional(),
});

export type AdminUserRoleInput = z.infer<typeof adminUserRoleSchema>;
export type PrayerRequestUpdateInput = z.infer<
  typeof prayerRequestUpdateSchema
>;
export type ManualFinanceUpdateInput = z.input<
  typeof manualFinanceUpdateSchema
>;
