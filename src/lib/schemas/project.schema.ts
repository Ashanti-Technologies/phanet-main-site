import { z } from "zod";

export const projectCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  fundingMode: z.enum(["SINGLE_SPONSOR", "MULTI_CONTRIBUTOR"]),
  status: z.enum(["ACTIVE", "DISABLED", "FULFILLED"]).default("ACTIVE"),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export const projectStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["ACTIVE", "DISABLED", "FULFILLED"]),
});

export const projectImageSchema = z.object({
  projectId: z.string().cuid(),
  url: z.string().url("Must be a valid URL"),
  publicId: z.string().min(1, "Public ID is required"),
  order: z.number().int().min(0).optional(),
});

export const projectImageDeleteSchema = z.object({
  id: z.string().cuid(),
});

export const projectImageReorderSchema = z.object({
  projectId: z.string().cuid(),
  imageIds: z.array(z.string().cuid()),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;
export type ProjectImageInput = z.infer<typeof projectImageSchema>;
export type ProjectImageDeleteInput = z.infer<typeof projectImageDeleteSchema>;
export type ProjectImageReorderInput = z.infer<
  typeof projectImageReorderSchema
>;
