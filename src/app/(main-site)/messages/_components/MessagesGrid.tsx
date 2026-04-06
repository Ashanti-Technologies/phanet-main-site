"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Loader2 } from "lucide-react";
import type { YoutubeVideo, VideosPage } from "@/lib/youtube";

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchMessages({
  pageParam,
}: {
  pageParam: string | undefined;
}): Promise<VideosPage> {
  const params = new URLSearchParams({ maxResults: "13" });
  if (pageParam) {
    params.set("pageToken", pageParam);
    params.set("maxResults", "12");
  }
  const res = await fetch(`/api/messages?${params}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

// ─── Featured card ──────────────────────────────────────────────────────────

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
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        <div className="absolute top-4 left-4">
          <span className="bg-crayola text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Latest Message
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center p-7 lg:p-10 lg:w-2/5">
        <p className="text-gray-400 text-sm font-medium mb-3">
          {video.publishedAt}
        </p>
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

// ─── Grid card ──────────────────────────────────────────────────────────────

function MessageCard({ video }: { video: YoutubeVideo }) {
  return (
    <Link
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-white/10 transition-colors"
    >
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
      <div className="p-4 flex flex-col flex-1">
        <p className="text-gray-500 text-xs mb-2">{video.publishedAt}</p>
        <h3 className="text-white text-sm font-semibold leading-snug line-clamp-3 flex-1">
          {video.title}
        </h3>
      </div>
    </Link>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 border border-white/5 animate-pulse">
      <div className="aspect-video bg-gray-800" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-16 bg-gray-800 rounded" />
        <div className="h-4 w-full bg-gray-800 rounded" />
        <div className="h-4 w-3/4 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MessagesGrid() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ["messages"],
    queryFn: fetchMessages,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
  });

  // Intersection observer — triggers fetchNextPage when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" } // start loading before user hits the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allVideos = data?.pages.flatMap((p) => p.videos) ?? [];
  const totalResults = data?.pages[0]?.totalResults ?? 0;
  const featuredVideo = allVideos[0];
  const gridVideos = allVideos.slice(1);

  // Initial loading
  if (status === "pending") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">
          {(error as Error)?.message ?? "Unable to load messages right now."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-crayola text-sm font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Total count */}
      {totalResults > 0 && (
        <p className="text-gray-500 text-sm mb-8">
          {totalResults.toLocaleString()} messages
        </p>
      )}

      {/* Featured (first video only) */}
      {featuredVideo && <FeaturedCard video={featuredVideo} />}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gridVideos.map((video) => (
          <MessageCard key={video.id} video={video} />
        ))}

        {/* Skeleton cards while loading next page */}
        {isFetchingNextPage &&
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)}
      </div>

      {/* Invisible sentinel — triggers infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* End of list */}
      {!hasNextPage && allVideos.length > 0 && (
        <p className="text-center text-gray-600 text-sm mt-16 pb-4">
          You&apos;ve reached the end · {allVideos.length} messages loaded
        </p>
      )}

      {/* Spinner shown while fetching (fallback for no IntersectionObserver) */}
      {isFetchingNextPage && (
        <div className="flex justify-center mt-10">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      )}
    </>
  );
}
