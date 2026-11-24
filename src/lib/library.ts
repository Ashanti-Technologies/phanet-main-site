import { v2 as cloudinary } from "cloudinary";
import type { Author, Publication } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/** PDFs are uploaded as `authenticated`, so every page needs a signed URL. */
export const PDF_DELIVERY_TYPE = "authenticated";
export const LIBRARY_FOLDER = "phanet/library";

/** Authors with at least this many published books get their own shelf. */
export const OWN_SHELF_MIN = 2;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pageUrl(pdfPublicId: string, page: number, width: number) {
  return cloudinary.url(pdfPublicId, {
    type: PDF_DELIVERY_TYPE,
    sign_url: true,
    resource_type: "image",
    format: "jpg",
    transformation: [{ page, width, crop: "limit", quality: "auto" }],
  });
}

type BookFields = Pick<
  Publication,
  "slug" | "access" | "pdfPublicId" | "pageCount" | "previewPages" | "downloadable" | "coverUrl"
>;

export function coverSrc(pub: BookFields, width = 600) {
  if (pub.coverUrl) return pub.coverUrl;
  return pub.pdfPublicId ? pageUrl(pub.pdfPublicId, 1, width) : null;
}

/** How many pages a visitor may read. Paid books stop at the preview until sales ship. */
export function readablePageCount(pub: BookFields) {
  if (!pub.pdfPublicId || !pub.pageCount) return 0;
  if (pub.access === "FREE") return pub.pageCount;
  if (pub.access === "PAID") return Math.min(pub.previewPages, pub.pageCount);
  return 0;
}

/** Signed URLs for only the pages this visitor may read, so later pages can't be guessed. */
export function readablePages(pub: BookFields, width = 900) {
  const n = readablePageCount(pub);
  return Array.from({ length: n }, (_, i) => pageUrl(pub.pdfPublicId!, i + 1, width));
}

export function downloadUrl(pub: BookFields) {
  if (pub.access !== "FREE" || !pub.downloadable || !pub.pdfPublicId) return null;
  return cloudinary.url(pub.pdfPublicId, {
    type: PDF_DELIVERY_TYPE,
    sign_url: true,
    resource_type: "image",
    format: "pdf",
    flags: `attachment:${pub.slug}`,
  });
}

/** Spine width from page count, so thick books look thick. */
export function spineThickness(pageCount: number | null) {
  if (!pageCount) return 32;
  return Math.round(Math.min(56, Math.max(22, 18 + pageCount / 8)));
}

export type ShelfBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  color: string;
  coverImage?: string;
  thickness: number;
  access: Publication["access"];
};

function toShelfBook(pub: Publication, author: Author): ShelfBook {
  return {
    id: pub.id,
    slug: pub.slug,
    title: pub.title,
    author: author.name,
    description: pub.description,
    color: pub.spineColor,
    coverImage: coverSrc(pub, 500) ?? undefined,
    thickness: spineThickness(pub.pageCount),
    access: pub.access,
  };
}

export type AuthorShelf = {
  id: string;
  name: string;
  subtext: string | null;
  avatarUrl: string | null;
  books: ShelfBook[];
};

export async function getLibraryShelves() {
  const authors = await prisma.author.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      publications: {
        where: { status: "PUBLISHED" },
        orderBy: [{ order: "asc" }, { year: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  const shelves: AuthorShelf[] = [];
  const shared: ShelfBook[] = [];
  for (const a of authors) {
    const books = a.publications.map((p) => toShelfBook(p, a));
    if (books.length >= OWN_SHELF_MIN) {
      shelves.push({ id: a.id, name: a.name, subtext: a.subtext, avatarUrl: a.avatarUrl, books });
    } else {
      shared.push(...books);
    }
  }
  return { shelves, shared };
}

export async function getPublishedPublication(slug: string) {
  return prisma.publication.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { author: true },
  });
}
