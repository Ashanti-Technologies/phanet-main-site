import type { Metadata } from "next";
import Link from "next/link";
import { Images, Lock } from "lucide-react";
import { getSessionOrNull } from "@/lib/auth-guard";
import { getGalleryAlbums, type AlbumCard } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery | Phanerosis Prayer Network",
  description: "Photos from PHANET services, conferences, outreaches and gatherings.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ year?: string }> };

export default async function GalleryPage({ searchParams }: Props) {
  const [{ year }, session] = await Promise.all([searchParams, getSessionOrNull()]);
  const albums = await getGalleryAlbums(!!session?.user);
  const years = [...new Set(albums.map((a) => new Date(a.date).getFullYear()))];
  const shown = year ? albums.filter((a) => String(new Date(a.date).getFullYear()) === year) : albums;

  return (
    <main className="min-h-screen bg-gray-950">
      <section className="relative bg-gray-950 pt-32 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">Moments from the Network</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">Gallery</h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Photos from our services, conferences, outreaches and gatherings.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {years.length > 1 && (
          <nav aria-label="Filter by year" className="mb-8 flex flex-wrap justify-center gap-2">
            <YearChip href="/gallery" active={!year} label="All" />
            {years.map((y) => (
              <YearChip key={y} href={`/gallery?year=${y}`} active={year === String(y)} label={String(y)} />
            ))}
          </nav>
        )}

        {shown.length === 0 ? (
          <p className="py-16 text-center text-gray-400">No albums yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a) => (
              <AlbumTile key={a.slug} album={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function YearChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-gray-950" : "bg-white/10 text-white/80 hover:bg-white/20"
      }`}
    >
      {label}
    </Link>
  );
}

function AlbumTile({ album }: { album: AlbumCard }) {
  const date = new Date(album.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const href = album.locked
    ? `/auth/login?callbackUrl=${encodeURIComponent(`/gallery/${album.slug}`)}`
    : `/gallery/${album.slug}`;

  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:ring-white/30">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
        {album.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URL, already sized
          <img
            src={album.coverUrl}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 ${album.locked ? "scale-110" : "group-hover:scale-105"}`}
          />
        )}
        {album.locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
            <Lock className="size-7" aria-hidden="true" />
            <span className="text-sm font-medium">Sign in to view</span>
          </div>
        )}
        {album.membersOnly && !album.locked && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            <Lock className="size-3" aria-hidden="true" /> Members
          </span>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-white">{album.title}</h2>
        <p className="mt-1 flex items-center gap-3 text-sm text-gray-400">
          <span>{date}</span>
          <span className="inline-flex items-center gap-1">
            <Images className="size-3.5" aria-hidden="true" /> {album.photoCount}
          </span>
        </p>
      </div>
    </Link>
  );
}
