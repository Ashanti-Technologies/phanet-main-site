"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { assertNotPreviewing, getSessionOrNull, requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { cloudinary, slugify } from "@/lib/library";
import {
  albumAccess,
  GALLERY_FOLDER,
  PHOTO_DELIVERY_TYPE,
  photoUrl,
  THUMB_WIDTH,
  UPLOAD_TRANSFORMATION,
} from "@/lib/gallery";
import {
  addPhotosSchema,
  albumUpsertSchema,
  takedownRequestSchema,
  type AddPhotosInput,
  type AlbumUpsertInput,
  type TakedownRequestInput,
} from "@/lib/schemas/gallery.schema";

function revalidateGallery(slug?: string) {
  revalidatePath("/admin/content/gallery", "layout");
  revalidatePath("/gallery");
  if (slug) revalidatePath(`/gallery/${slug}`);
}

async function destroyPhotos(publicIds: string[]) {
  for (let i = 0; i < publicIds.length; i += 100) {
    const chunk = publicIds.slice(i, i + 100);
    try {
      await cloudinary.api.delete_resources(chunk, { type: PHOTO_DELIVERY_TYPE, resource_type: "image", invalidate: true });
    } catch (err) {
      log.warn("gallery", "photo cleanup failed", { count: chunk.length, err });
    }
  }
}

// ------------------------------------------------------------------ admin

export async function getAdminAlbums() {
  await requirePermission("read", "GalleryAlbum");
  const albums = await prisma.galleryAlbum.findMany({
    orderBy: { date: "desc" },
    include: {
      event: { select: { title: true } },
      _count: { select: { photos: true } },
    },
  });
  const pending = await prisma.galleryTakedown.count({ where: { status: "PENDING" } });
  return { albums, pending };
}

export async function getAdminAlbum(id: string) {
  await requirePermission("read", "GalleryAlbum");
  const album = await prisma.galleryAlbum.findUnique({
    where: { id },
    include: { photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });
  if (!album) return null;
  return {
    ...album,
    photos: album.photos.map((p) => ({ ...p, thumbUrl: photoUrl(p.publicId, 400) })),
  };
}

export async function getEventOptions() {
  await requirePermission("read", "GalleryAlbum");
  return prisma.event.findMany({
    orderBy: { date: "desc" },
    take: 100,
    select: { id: true, title: true, date: true },
  });
}

export async function saveAlbum(input: AlbumUpsertInput) {
  const data = albumUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "GalleryAlbum");
  const payload = {
    title: data.title,
    description: data.description || null,
    date: data.date,
    eventId: data.eventId || null,
    visibility: data.visibility,
    status: data.status,
  };
  let album;
  if (data.id) {
    album = await prisma.galleryAlbum.update({ where: { id: data.id }, data: payload });
  } else {
    // Slug is set once so shared links survive title edits.
    const root = slugify(data.title) || "album";
    let slug = root;
    for (let i = 2; await prisma.galleryAlbum.findUnique({ where: { slug } }); i++) slug = `${root}-${i}`;
    album = await prisma.galleryAlbum.create({ data: { ...payload, slug } });
  }
  revalidateGallery(album.slug);
  return { success: true, data: { id: album.id, slug: album.slug } };
}

export async function deleteAlbum(id: string) {
  await requirePermission("delete", "GalleryAlbum");
  const photos = await prisma.galleryPhoto.findMany({ where: { albumId: id }, select: { publicId: true } });
  const album = await prisma.galleryAlbum.delete({ where: { id } });
  await destroyPhotos(photos.map((p) => p.publicId));
  revalidateGallery(album.slug);
  return { success: true };
}

/** Lets an admin's browser upload photos straight to Cloudinary as `authenticated` assets. */
export async function signGalleryUpload() {
  await requirePermission("update", "GalleryAlbum");
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: GALLERY_FOLDER, type: PHOTO_DELIVERY_TYPE, transformation: UPLOAD_TRANSFORMATION };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return {
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export async function addPhotos(input: AddPhotosInput) {
  const data = addPhotosSchema.parse(input);
  await requirePermission("update", "GalleryAlbum");
  const last = await prisma.galleryPhoto.aggregate({ where: { albumId: data.albumId }, _max: { order: true } });
  const start = (last._max.order ?? -1) + 1;
  await prisma.galleryPhoto.createMany({
    data: data.photos.map((p, i) => ({ ...p, albumId: data.albumId, order: start + i })),
    skipDuplicates: true,
  });
  const album = await prisma.galleryAlbum.findUnique({ where: { id: data.albumId }, select: { slug: true } });
  revalidateGallery(album?.slug);
  return { success: true };
}

export async function updatePhotoCaption(id: string, caption: string) {
  await requirePermission("update", "GalleryAlbum");
  const photo = await prisma.galleryPhoto.update({
    where: { id },
    data: { caption: caption.trim().slice(0, 300) || null },
    select: { album: { select: { slug: true } } },
  });
  revalidateGallery(photo.album.slug);
  return { success: true };
}

export async function setAlbumCover(albumId: string, photoId: string) {
  await requirePermission("update", "GalleryAlbum");
  const album = await prisma.galleryAlbum.update({ where: { id: albumId }, data: { coverPhotoId: photoId } });
  revalidateGallery(album.slug);
  return { success: true };
}

export async function reorderPhotos(albumId: string, photoIds: string[]) {
  await requirePermission("update", "GalleryAlbum");
  await prisma.$transaction(
    photoIds.map((id, order) => prisma.galleryPhoto.updateMany({ where: { id, albumId }, data: { order } })),
  );
  const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId }, select: { slug: true } });
  revalidateGallery(album?.slug);
  return { success: true };
}

export async function deletePhoto(id: string) {
  await requirePermission("update", "GalleryAlbum");
  const photo = await prisma.galleryPhoto.delete({ where: { id }, include: { album: { select: { slug: true } } } });
  await destroyPhotos([photo.publicId]);
  revalidateGallery(photo.album.slug);
  return { success: true };
}

export async function getTakedownRequests() {
  await requirePermission("read", "GalleryAlbum");
  const requests = await prisma.galleryTakedown.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true } },
      photo: { select: { id: true, publicId: true, album: { select: { id: true, title: true } } } },
    },
  });
  return requests.map((r) => ({ ...r, thumbUrl: photoUrl(r.photo.publicId, THUMB_WIDTH) }));
}

/** Resolves every pending request on the photo. REMOVED deletes it; DISMISSED shows it again. */
export async function resolveTakedown(id: string, outcome: "REMOVED" | "DISMISSED") {
  await requirePermission("update", "GalleryAlbum");
  const session = await getSessionOrNull();
  const request = await prisma.galleryTakedown.findUniqueOrThrow({
    where: { id },
    include: { photo: { include: { album: { select: { slug: true } } } } },
  });
  const { photo } = request;
  const pending = await prisma.galleryTakedown.findMany({ where: { photoId: photo.id, status: "PENDING" } });

  await logAudit({
    action: `gallery.takedown_${outcome.toLowerCase()}`,
    subject: "GalleryAlbum",
    subjectId: photo.albumId,
    meta: { photoId: photo.id, publicId: photo.publicId, reasons: pending.map((p) => p.reason), requests: pending.length },
  });

  if (outcome === "REMOVED") {
    await prisma.galleryPhoto.delete({ where: { id: photo.id } });
    await destroyPhotos([photo.publicId]);
  } else {
    await prisma.$transaction([
      prisma.galleryTakedown.updateMany({
        where: { photoId: photo.id, status: "PENDING" },
        data: { status: "DISMISSED", resolvedAt: new Date(), resolvedById: session?.user.id },
      }),
      prisma.galleryPhoto.update({ where: { id: photo.id }, data: { hidden: false } }),
    ]);
  }
  revalidateGallery(photo.album.slug);
  return { success: true };
}

// ----------------------------------------------------------------- public

/** Any signed-in user may ask for a photo to come down; it is hidden until an admin decides. */
export async function requestTakedown(input: TakedownRequestInput) {
  const data = takedownRequestSchema.parse(input);
  const session = await getSessionOrNull();
  if (!session?.user) return { success: false, error: "Please sign in to request a removal." };
  await assertNotPreviewing("create");

  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: data.photoId },
    include: { album: { select: { slug: true, status: true, visibility: true } } },
  });
  if (!photo || albumAccess(photo.album, true) !== "open") return { success: false, error: "Photo not found." };

  const existing = await prisma.galleryTakedown.findFirst({
    where: { photoId: photo.id, userId: session.user.id, status: "PENDING" },
  });
  if (!existing) {
    await prisma.$transaction([
      prisma.galleryTakedown.create({
        data: { photoId: photo.id, userId: session.user.id, reason: data.reason, note: data.note || null },
      }),
      prisma.galleryPhoto.update({ where: { id: photo.id }, data: { hidden: true } }),
    ]);
    log.info("gallery", "takedown requested", { photoId: photo.id, reason: data.reason });
  }
  revalidateGallery(photo.album.slug);
  return { success: true };
}
