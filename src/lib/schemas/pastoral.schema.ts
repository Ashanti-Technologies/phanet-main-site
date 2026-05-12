import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

const requiredDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: "custom", message: "Valid date is required" });
    return z.NEVER;
  }
  return date;
});

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  });

export const visitationCreateSchema = z.object({
  memberId: z.string().min(1),
  visitedById: z.string().min(1),
  visitedAt: requiredDate,
  notes: optionalString,
});

export const visitationUpdateSchema = visitationCreateSchema.extend({
  id: z.string().min(1),
});

export const followUpTaskCreateSchema = z.object({
  memberId: z.string().min(1),
  assignedToId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required").max(200),
  notes: optionalString,
  dueAt: optionalDate,
  status: z.enum(["OPEN", "DONE", "CANCELLED"]).default("OPEN"),
});

export const followUpTaskUpdateSchema = followUpTaskCreateSchema.extend({
  id: z.string().min(1),
});

export const followUpTaskStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]),
});

export const memberNoteCreateSchema = z.object({
  memberId: z.string().min(1),
  body: z.string().trim().min(1, "Note is required").max(5000),
  visibility: z.enum(["PASTORAL", "GENERAL"]).default("GENERAL"),
});

export const memberNoteUpdateSchema = memberNoteCreateSchema.extend({
  id: z.string().min(1),
});

export const idSchema = z.string().min(1);

export type VisitationCreateInput = z.input<typeof visitationCreateSchema>;
export type VisitationUpdateInput = z.input<typeof visitationUpdateSchema>;
export type FollowUpTaskCreateInput = z.input<typeof followUpTaskCreateSchema>;
export type FollowUpTaskUpdateInput = z.input<typeof followUpTaskUpdateSchema>;
export type FollowUpTaskStatusInput = z.input<typeof followUpTaskStatusSchema>;
export type MemberNoteCreateInput = z.input<typeof memberNoteCreateSchema>;
export type MemberNoteUpdateInput = z.input<typeof memberNoteUpdateSchema>;
