import { z } from "zod";

export const churchUnitCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const churchUnitUpdateSchema = churchUnitCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export const churchUnitDeleteSchema = z.object({
  id: z.string().cuid(),
});

export type ChurchUnitCreateInput = z.infer<typeof churchUnitCreateSchema>;
export type ChurchUnitUpdateInput = z.infer<typeof churchUnitUpdateSchema>;
export type ChurchUnitDeleteInput = z.infer<typeof churchUnitDeleteSchema>;
