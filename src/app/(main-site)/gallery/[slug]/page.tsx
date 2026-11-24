import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Lock } from "lucide-react";
import { getSessionOrNull } from "@/lib/auth-guard";
import { getAlbumForViewer } from "@/lib/gallery";
import { AlbumViewer } from "../_components/AlbumViewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSessionOrNull();
  const data = await getAlbumForViewer(slug, !!session?.user);
  if (!data) return {};
  return {
    title: `${data.album.title} | Gallery | Phanerosis Prayer Network`,
    description: data.album.description ?? `Photos from ${data.album.title}.`,
    robots: data.album.membersOnly ? { index: false } : undefined,
  };
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionOrNull();
  const data = await getAlbumForViewer(slug, !!session?.user);
  if (!data) notFound();
  if (data.access === "locked") redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/gallery/${slug}`)}`);

  const { album, images } = data;
  const date = new Date(album.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-gray-950 pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/gallery" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> All albums
        </Link>
        <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{album.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" /> {date}
              </span>
              <span>{images.length} photos</span>
              {album.membersOnly && (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3.5" aria-hidden="true" /> Members only
                </span>
              )}
            </p>
            {album.description && <p className="mt-3 max-w-2xl text-gray-300">{album.description}</p>}
          </div>
          {album.event && (
            <Link
              href={`/events/${album.event.slug}`}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              About this event
            </Link>
          )}
        </div>

        <AlbumViewer images={images} signedIn={!!session?.user} albumPath={`/gallery/${slug}`} />
      </div>
    </main>
  );
}
