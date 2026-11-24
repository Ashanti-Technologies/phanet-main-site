import { z } from "zod";
import { optionalUrlSchema, publishStatusSchema } from "./cms.schema";

export const authorUpsertSchema = z.object({
  id: z.cuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(120),
  subtext: z.string().trim().max(160).optional(),
  avatarUrl: optionalUrlSchema,
  order: z.coerce.number().int().min(0).default(0),
});

export const publicationUpsertSchema = z
  .object({
    id: z.cuid().optional(),
    title: z.string().trim().min(2, "Title is required").max(200),
    subtitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    kind: z.enum(["BOOK", "DEVOTIONAL", "BOOKLET", "MAGAZINE"]).default("BOOK"),
    year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
    authorId: z.cuid("Pick an author"),
    access: z.enum(["FREE", "AMAZON", "PAID"]).default("FREE"),
    pdfPublicId: z.string().trim().optional(),
    pageCount: z.coerce.number().int().min(1).optional().nullable(),
    previewPages: z.coerce.number().int().min(1).max(100).default(10),
    downloadable: z.boolean().default(true),
    coverUrl: optionalUrlSchema,
    backCoverUrl: optionalUrlSchema,
    spineColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a colour").default("#7c2d12"),
    buyUrl: optionalUrlSchema,
    status: publishStatusSchema.default("DRAFT"),
    order: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((d, ctx) => {
    if (d.access === "AMAZON") {
      if (!d.buyUrl) ctx.addIssue({ code: "custom", path: ["buyUrl"], message: "Amazon books need the store link" });
      if (!d.coverUrl) ctx.addIssue({ code: "custom", path: ["coverUrl"], message: "Amazon books need a cover image" });
    } else if (!d.pdfPublicId || !d.pageCount) {
      ctx.addIssue({ code: "custom", path: ["pdfPublicId"], message: "Upload the PDF" });
    }
  });

export type AuthorUpsertInput = z.input<typeof authorUpsertSchema>;
export type PublicationUpsertInput = z.input<typeof publicationUpsertSchema>;
