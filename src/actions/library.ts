"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { log } from "@/lib/logger";
import { cloudinary, LIBRARY_FOLDER, PDF_DELIVERY_TYPE, slugify } from "@/lib/library";
import {
  authorUpsertSchema,
  publicationUpsertSchema,
  type AuthorUpsertInput,
  type PublicationUpsertInput,
} from "@/lib/schemas/library.schema";

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateLibrary(slug?: string) {
  revalidatePath("/admin/content/library");
  revalidatePath("/library");
  if (slug) revalidatePath(`/library/${slug}`);
}

/** First free slug: "title", then "title-2", "title-3"… */
async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "untitled";
  let slug = root;
  for (let i = 2; await taken(slug); i++) slug = `${root}-${i}`;
  return slug;
}

async function destroyPdf(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { type: PDF_DELIVERY_TYPE, resource_type: "image", invalidate: true });
  } catch (err) {
    log.warn("library", "pdf cleanup failed", { publicId, err });
  }
}

export async function getAdminLibrary() {
  await requirePermission("read", "Publication");
  const [authors, publications] = await Promise.all([
    prisma.author.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { publications: true } } },
    }),
    prisma.publication.findMany({
      orderBy: [{ author: { order: "asc" } }, { order: "asc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    }),
  ]);
  return { authors, publications };
}

export async function getAdminPublication(id: string) {
  await requirePermission("read", "Publication");
  return prisma.publication.findUnique({ where: { id } });
}

export async function getAuthorOptions() {
  await requirePermission("read", "Publication");
  return prisma.author.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } });
}

export async function saveAuthor(input: AuthorUpsertInput) {
  const data = authorUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "Publication");
  const payload = {
    name: data.name,
    subtext: emptyToNull(data.subtext),
    avatarUrl: emptyToNull(data.avatarUrl),
    order: data.order,
  };
  const author = data.id
    ? await prisma.author.update({ where: { id: data.id }, data: payload })
    : await prisma.author.create({
        data: {
          ...payload,
          slug: await uniqueSlug(data.name, async (slug) => !!(await prisma.author.findUnique({ where: { slug } }))),
        },
      });
  revalidateLibrary();
  return { success: true, data: author };
}

export async function deleteAuthor(id: string) {
  await requirePermission("delete", "Publication");
  const books = await prisma.publication.count({ where: { authorId: id } });
  if (books > 0) throw new Error(`Move or delete this author's ${books} book(s) first.`);
  await prisma.author.delete({ where: { id } });
  revalidateLibrary();
  return { success: true };
}

/** Lets an admin's browser upload a PDF straight to Cloudinary as an `authenticated` asset. */
export async function signLibraryUpload() {
  await requirePermission("create", "Publication");
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: LIBRARY_FOLDER, type: PDF_DELIVERY_TYPE };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return {
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export async function savePublication(input: PublicationUpsertInput) {
  const data = publicationUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "Publication");
  const hasPdf = data.access !== "AMAZON";
  const payload = {
    title: data.title,
    subtitle: emptyToNull(data.subtitle),
    description: emptyToNull(data.description),
    kind: data.kind,
    year: data.year ?? null,
    authorId: data.authorId,
    access: data.access,
    pdfPublicId: hasPdf ? emptyToNull(data.pdfPublicId) : null,
    pageCount: hasPdf ? (data.pageCount ?? null) : null,
    previewPages: data.previewPages,
    downloadable: data.downloadable,
    coverUrl: emptyToNull(data.coverUrl),
    backCoverUrl: emptyToNull(data.backCoverUrl),
    spineColor: data.spineColor,
    buyUrl: data.access === "AMAZON" ? emptyToNull(data.buyUrl) : null,
    status: data.status,
    order: data.order,
  };

  const previous = data.id
    ? await prisma.publication.findUnique({ where: { id: data.id }, select: { pdfPublicId: true } })
    : null;
  // Slug is set once so shared links never break when a title is edited.
  const pub = data.id
    ? await prisma.publication.update({ where: { id: data.id }, data: payload })
    : await prisma.publication.create({
        data: {
          ...payload,
          slug: await uniqueSlug(data.title, async (slug) => !!(await prisma.publication.findUnique({ where: { slug } }))),
        },
      });

  if (previous?.pdfPublicId && previous.pdfPublicId !== pub.pdfPublicId) await destroyPdf(previous.pdfPublicId);
  revalidateLibrary(pub.slug);
  return { success: true, data: { id: pub.id, slug: pub.slug } };
}

export async function deletePublication(id: string) {
  await requirePermission("delete", "Publication");
  const pub = await prisma.publication.delete({ where: { id } });
  if (pub.pdfPublicId) await destroyPdf(pub.pdfPublicId);
  revalidateLibrary(pub.slug);
  return { success: true };
}
