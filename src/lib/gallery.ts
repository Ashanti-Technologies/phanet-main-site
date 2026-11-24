import type { AlbumVisibility, PublishStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { cloudinary } from "@/lib/library";

/** Every photo is `authenticated`: URLs are signed here, so visibility is just a DB flag. */
export const PHOTO_DELIVERY_TYPE = "authenticated";
export const GALLERY_FOLDER = "phanet/gallery";
/** Incoming transformation: phone photos are capped before they are stored. */
export const UPLOAD_TRANSFORMATION = "c_limit,w_2400,h_2400";

export const THUMB_WIDTH = 600;
export const FULL_WIDTH = 2000;

export function photoUrl(publicId: string, width: number, { blur = false } = {}) {
  return cloudinary.url(publicId, {
    type: PHOTO_DELIVERY_TYPE,
    sign_url: true,
    resource_type: "image",
    transformation: [
      { width, crop: "limit", quality: "auto", fetch_format: "auto" },
      // Blurred server-side so a locked card never ships the clear photo.
      ...(blur ? [{ effect: "blur:2000" }] : []),
    ],
  });
}

type AlbumAccess = { status: PublishStatus; visibility: AlbumVisibility };

/** null = not found for anyone; "locked" = exists but needs sign-in. */
export function albumAccess(album: AlbumAccess, signedIn: boolean): "open" | "locked" | null {
  if (album.status !== "PUBLISHED") return null;
  if (album.visibility === "MEMBERS" && !signedIn) return "locked";
  return "open";
}

export type AlbumCard = {
  slug: string;
  title: string;
  date: string;
  photoCount: number;
  locked: boolean;
  membersOnly: boolean;
  coverUrl: string | null;
};

export async function getGalleryAlbums(signedIn: boolean): Promise<AlbumCard[]> {
  const albums = await prisma.galleryAlbum.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
    include: {
      _count: { select: { photos: { where: { hidden: false } } } },
      photos: { where: { hidden: false }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: 1, select: { id: true, publicId: true } },
    },
  });
  const coverIds = albums.map((a) => a.coverPhotoId).filter((id): id is string => !!id);
  const covers = new Map(
    (await prisma.galleryPhoto.findMany({ where: { id: { in: coverIds }, hidden: false }, select: { id: true, publicId: true } })).map(
      (p) => [p.id, p.publicId],
    ),
  );

  return albums
    .filter((a) => a._count.photos > 0)
    .map((a) => {
      const locked = albumAccess(a, signedIn) === "locked";
      const cover = (a.coverPhotoId && covers.get(a.coverPhotoId)) || a.photos[0]?.publicId;
      return {
        slug: a.slug,
        title: a.title,
        date: a.date.toISOString(),
        photoCount: a._count.photos,
        locked,
        membersOnly: a.visibility === "MEMBERS",
        coverUrl: cover ? photoUrl(cover, locked ? 400 : 800, { blur: locked }) : null,
      };
    });
}

export type GalleryImage = {
  id: string;
  src: string;
  thumbSrc: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export async function getAlbumForViewer(slug: string, signedIn: boolean) {
  const album = await prisma.galleryAlbum.findUnique({
    where: { slug },
    include: {
      event: { select: { slug: true, title: true, status: true } },
      photos: { where: { hidden: false }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) return null;
  const access = albumAccess(album, signedIn);
  if (!access) return null;

  const images: GalleryImage[] =
    access === "open"
      ? album.photos.map((p, i) => ({
          id: p.id,
          src: photoUrl(p.publicId, FULL_WIDTH),
          thumbSrc: photoUrl(p.publicId, THUMB_WIDTH),
          alt: p.caption || `${album.title}, photo ${i + 1}`,
          width: p.width,
          height: p.height,
          caption: p.caption ?? undefined,
        }))
      : [];

  return {
    access,
    album: {
      slug: album.slug,
      title: album.title,
      description: album.description,
      date: album.date.toISOString(),
      membersOnly: album.visibility === "MEMBERS",
      event: album.event?.status === "PUBLISHED" ? { slug: album.event.slug, title: album.event.title } : null,
    },
    images,
  };
}
