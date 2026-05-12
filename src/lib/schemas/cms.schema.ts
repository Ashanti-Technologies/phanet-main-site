import { z } from "zod";

export const publishStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

const optionalUrlSchema = z
  .url("Must be a valid URL")
  .trim()
  .or(z.literal(""))
  .optional();

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is required")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens only",
  );

export const richTextSchema = z.object({
  bodyJson: z.unknown().optional(),
  bodyHtml: z.string().trim().min(1, "Content is required"),
});

export const eventUpsertSchema = richTextSchema.extend({
  id: z.cuid().optional(),
  slug: slugSchema,
  title: z.string().trim().min(3).max(200),
  category: z.enum(["national", "regional", "university-chapter", "diaspora"]),
  date: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  time: z.string().trim().min(1).max(80),
  location: z.string().trim().min(2).max(160),
  address: z.string().trim().optional(),
  description: z.string().trim().min(10),
  isFeatured: z.boolean().default(false),
  registrationUrl: optionalUrlSchema,
  imageUrl: optionalUrlSchema,
  imagePublicId: z.string().trim().optional(),
  imageAlt: z.string().trim().optional(),
  status: publishStatusSchema.default("DRAFT"),
});

export const contentPageUpsertSchema = richTextSchema.extend({
  id: z.cuid().optional(),
  slug: slugSchema,
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().optional(),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
  imageUrl: optionalUrlSchema,
  imagePublicId: z.string().trim().optional(),
  imageAlt: z.string().trim().optional(),
  status: publishStatusSchema.default("DRAFT"),
});

export const homepageSectionUpsertSchema = richTextSchema.extend({
  id: z.cuid().optional(),
  key: slugSchema,
  eyebrow: z.string().trim().optional(),
  title: z.string().trim().min(3).max(200),
  ctaLabel: z.string().trim().optional(),
  ctaHref: z.string().trim().optional(),
  imageUrl: optionalUrlSchema,
  imagePublicId: z.string().trim().optional(),
  imageAlt: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).default(0),
  status: publishStatusSchema.default("DRAFT"),
});

export const sermonFeatureUpsertSchema = z.object({
  id: z.cuid().optional(),
  videoId: z.string().trim().min(3),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().optional(),
  thumbnailUrl: optionalUrlSchema,
  videoUrl: z.string().trim().url("Must be a valid URL"),
  publishedAt: z.coerce.date().optional().nullable(),
  isFeatured: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
  status: publishStatusSchema.default("DRAFT"),
});

export const mediaAssetCreateSchema = z.object({
  url: z.url("Must be a valid URL").trim(),
  publicId: z.string().trim().min(1),
  altText: z.string().trim().min(1, "Alt text is required"),
  caption: z.string().trim().optional(),
  ownerType: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
});

export type PublishStatusInput = z.infer<typeof publishStatusSchema>;
export type EventUpsertInput = z.input<typeof eventUpsertSchema>;
export type ContentPageUpsertInput = z.input<typeof contentPageUpsertSchema>;
export type HomepageSectionUpsertInput = z.input<
  typeof homepageSectionUpsertSchema
>;
export type SermonFeatureUpsertInput = z.input<
  typeof sermonFeatureUpsertSchema
>;
export type MediaAssetCreateInput = z.input<typeof mediaAssetCreateSchema>;
