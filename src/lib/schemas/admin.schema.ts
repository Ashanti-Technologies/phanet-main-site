import { z } from "zod";
import { ALL_ROLE_KEYS } from "@/lib/rbac/roles";

export const adminUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

export const adminUserRolesSchema = z
  .object({
    userId: z.string().min(1),
    roles: z.array(z.enum(ALL_ROLE_KEYS as [string, ...string[]])),
    unitIds: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (input) =>
      !input.roles.includes("unit_leader") || input.unitIds.length > 0,
    {
      message: "Unit Leader role requires at least one church unit",
      path: ["unitIds"],
    },
  );

export type AdminUserRolesInput = z.infer<typeof adminUserRolesSchema>;

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
