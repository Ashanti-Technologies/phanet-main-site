import { z } from "zod";

export const serviceCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: z.union([z.string(), z.date()]).transform((v) => {
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    return d;
  }),
  location: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const serviceUpdateSchema = serviceCreateSchema.extend({
  id: z.string().min(1),
});

export type ServiceCreateInput = z.input<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.input<typeof serviceUpdateSchema>;

export const attendanceMarkSchema = z.object({
  serviceId: z.string().min(1),
  memberId: z.string().min(1),
  method: z.enum(["MANUAL", "QR", "SELF"]).default("MANUAL"),
});

export const attendanceRemoveSchema = z.object({
  serviceId: z.string().min(1),
  memberId: z.string().min(1),
});

export type AttendanceMarkInput = z.input<typeof attendanceMarkSchema>;
export type AttendanceRemoveInput = z.input<typeof attendanceRemoveSchema>;
