import { z } from "zod";
import { publishStatusSchema } from "./cms.schema";

export const albumUpsertSchema = z.object({
  id: z.cuid().optional(),
  title: z.string().trim().min(2, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  date: z.coerce.date({ error: "Pick a date" }),
  eventId: z.cuid().optional().nullable(),
  visibility: z.enum(["PUBLIC", "MEMBERS"]).default("PUBLIC"),
  status: publishStatusSchema.default("DRAFT"),
});
export type AlbumUpsertInput = z.input<typeof albumUpsertSchema>;

export const addPhotosSchema = z.object({
  albumId: z.cuid(),
  photos: z
    .array(
      z.object({
        publicId: z.string().startsWith("phanet/gallery/"),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(200),
});
export type AddPhotosInput = z.input<typeof addPhotosSchema>;

export const takedownReasons = {
  ME_IN_PHOTO: "I'm in this photo",
  MY_CHILD_IN_PHOTO: "My child is in this photo",
  OTHER: "Something else",
} as const;

export const takedownRequestSchema = z.object({
  photoId: z.cuid(),
  reason: z.enum(["ME_IN_PHOTO", "MY_CHILD_IN_PHOTO", "OTHER"]),
  note: z.string().trim().max(500).optional(),
});
export type TakedownRequestInput = z.input<typeof takedownRequestSchema>;
