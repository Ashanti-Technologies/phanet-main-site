import { z } from "zod";

export const commitmentCreateSchema = z.object({
  projectId: z.string().cuid(),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  churchUnit: z.string().optional(),
  amountCommitted: z.coerce.number().positive("Amount must be positive"),
  isAnonymous: z.boolean().default(false),
});

export const commitmentStatusUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

export const commitmentFiltersSchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z
    .array(z.enum(["PENDING", "CONFIRMED", "CANCELLED"]))
    .catch([])
    .default([]),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().catch(1).default(1),
  limit: z.coerce.number().int().positive().max(100).catch(25).default(25),
  sort: z
    .object({ id: z.enum(["name", "amount", "date"]), desc: z.boolean() })
    .nullish()
    .catch(null),
});

export type CommitmentCreateInput = z.infer<typeof commitmentCreateSchema>;
export type CommitmentStatusUpdateInput = z.infer<
  typeof commitmentStatusUpdateSchema
>;
export type CommitmentFiltersInput = z.infer<typeof commitmentFiltersSchema>;
