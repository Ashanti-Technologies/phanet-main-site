import { z } from "zod";
import { PERMISSION_KEYS } from "@/lib/rbac/catalog";

export const adminRoleSaveSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Give the role a name").max(60),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(z.enum(PERMISSION_KEYS as [string, ...string[]])).min(1, "Pick at least one permission"),
});

export const accessGrantSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
  unitId: z.string().min(1).nullable(),
  expiresAt: z.coerce.date().nullable(),
});

export type AdminRoleSaveInput = z.infer<typeof adminRoleSaveSchema>;
export type AccessGrantInput = z.input<typeof accessGrantSchema>;

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

export type PrayerRequestUpdateInput = z.infer<
  typeof prayerRequestUpdateSchema
>;
export type ManualFinanceUpdateInput = z.input<
  typeof manualFinanceUpdateSchema
>;
