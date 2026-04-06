import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { getVideosPage, type YoutubeVideo } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Messages | Phanerosis Prayer Network",
  description:
    "Watch and grow through PHANET's library of teachings from Elim Hour, Women in Travail, special services, and more.",
};

// ─── Featured card (page 1 only) ───────────────────────────────────────────

function FeaturedCard({ video }: { video: YoutubeVideo }) {
  return (
    <Link
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col lg:flex-row rounded-2xl overflow-hidden bg-gray-900 border border-white/5 hover:border-white/10 transition-colors mb-10"
    >
      {/* Thumbnail */}
      <div className="relative w-full lg:w-3/5 aspect-video overflow-hidden">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        {/* Latest badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-crayola text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Latest Message
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center p-7 lg:p-10 lg:w-2/5">
        <p className="text-gray-400 text-sm font-medium mb-3">{video.publishedAt}</p>
        <h2 className="text-white text-2xl lg:text-3xl font-bold leading-snug mb-6 line-clamp-4">
          {video.title}
        </h2>
        <div className="inline-flex items-center gap-2 text-crayola font-semibold text-sm group-hover:gap-3 transition-all">
          <Play className="w-4 h-4 fill-crayola" />
          Watch Message
        </div>
      </div>
    </Link>
  );
}

// ─── Grid card ─────────────────────────────────────────────────────────────

function MessageCard({ video }: { video: YoutubeVideo }) {
  return (
    <Link
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-white/10 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-gray-500 text-xs mb-2">{video.publishedAt}</p>
        <h3 className="text-white text-sm font-semibold leading-snug line-clamp-3 flex-1">
          {video.title}
        </h3>
      </div>
    </Link>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────────────

function Pagination({
  nextPageToken,
  prevPageToken,
  currentToken,
  totalResults,
}: {
  nextPageToken?: string;
  prevPageToken?: string;
  currentToken?: string;
  totalResults: number;
}) {
  const prevHref = currentToken
    ? prevPageToken
      ? `/messages?pageToken=${encodeURIComponent(prevPageToken)}`
      : "/messages"
    : null;

  const nextHref = nextPageToken
    ? `/messages?pageToken=${encodeURIComponent(nextPageToken)}`
    : null;

  if (!prevHref && !nextHref) return null;

  return (
    <div className="flex items-center justify-between mt-14 pt-8 border-t border-white/10">
      <div>
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="text-gray-500 text-sm hidden sm:block">
        {totalResults > 0 ? `${totalResults.toLocaleString()} messages` : ""}
      </p>

      <div>
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ pageToken?: string }>;
}) {
  const { pageToken } = await searchParams;

  // Page 1: fetch 13 so we have 1 featured + 12 in grid
  // Other pages: fetch 12 for a clean grid
  const isFirstPage = !pageToken;
  const fetchCount = isFirstPage ? 13 : 12;

  const { videos, nextPageToken, prevPageToken, totalResults } =
    await getVideosPage(pageToken, fetchCount);

  const featuredVideo = isFirstPage ? videos[0] : undefined;
  const gridVideos = featuredVideo ? videos.slice(1) : videos;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="relative bg-gray-950 pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">
            Grow in Your Faith
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Messages
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Teachings from Elim Hour, Women in Travail, special services, and
            more — available for free on our YouTube channel.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {videos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            Unable to load messages right now. Please check back soon.
          </div>
        ) : (
          <>
            {/* Featured (page 1 only) */}
            {featuredVideo && <FeaturedCard video={featuredVideo} />}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridVideos.map((video) => (
                <MessageCard key={video.id} video={video} />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              nextPageToken={nextPageToken}
              prevPageToken={prevPageToken}
              currentToken={pageToken}
              totalResults={totalResults}
            />
          </>
        )}
      </section>
    </main>
  );
}
