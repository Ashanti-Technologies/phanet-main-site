import { z } from "zod";

export const messageChannelSchema = z.enum(["EMAIL", "SMS"]);

const segmentSchema = z.object({
  q: z.string().trim().optional().nullable(),
  unitId: z.string().optional().nullable(),
  tagId: z.string().optional().nullable(),
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
    .optional()
    .nullable(),
  ageBucket: z
    .enum(["under18", "18-29", "30-49", "50-69", "70plus"])
    .optional()
    .nullable(),
  /** Only include members who have opted in to this channel. */
  respectPreferences: z.boolean().default(true),
});

export type SegmentInput = z.infer<typeof segmentSchema>;

export const templateCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    channel: messageChannelSchema,
    subject: z.string().trim().max(200).optional().nullable(),
    body: z.string().trim().min(1).max(10_000),
    variables: z.array(z.string().trim().min(1)).default([]),
  })
  .refine(
    (v) => v.channel !== "EMAIL" || (v.subject && v.subject.length > 0),
    { message: "Email templates need a subject", path: ["subject"] },
  );

export const templateUpdateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    channel: messageChannelSchema,
    subject: z.string().trim().max(200).optional().nullable(),
    body: z.string().trim().min(1).max(10_000),
    variables: z.array(z.string().trim().min(1)).default([]),
  })
  .refine(
    (v) => v.channel !== "EMAIL" || (v.subject && v.subject.length > 0),
    { message: "Email templates need a subject", path: ["subject"] },
  );

export type TemplateCreateInput = z.input<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.input<typeof templateUpdateSchema>;

export const batchCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    channel: messageChannelSchema,
    templateId: z.string().optional().nullable(),
    subject: z.string().trim().max(200).optional().nullable(),
    body: z.string().trim().min(1).max(10_000),
    segment: segmentSchema,
  })
  .refine(
    (v) => v.channel !== "EMAIL" || (v.subject && v.subject.length > 0),
    { message: "Email batches need a subject", path: ["subject"] },
  );

export type BatchCreateInput = z.input<typeof batchCreateSchema>;
