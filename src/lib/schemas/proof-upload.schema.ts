import { z } from "zod";

export const proofUploadCreateSchema = z.object({
  projectId: z.string().cuid(),
  imageUrl: z.string().url("Must be a valid URL"),
  publicId: z.string().min(1, "Public ID is required"),
  note: z.string().optional(),
});

export const proofUploadDeleteSchema = z.object({
  id: z.string().cuid(),
});

export type ProofUploadCreateInput = z.infer<typeof proofUploadCreateSchema>;
export type ProofUploadDeleteInput = z.infer<typeof proofUploadDeleteSchema>;
