"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { YoutubeVideo } from "@/lib/youtube";

type Props = {
  featuredVideo: YoutubeVideo;
  otherVideos: YoutubeVideo[];
};

function FeaturedPlayer({ video }: { video: YoutubeVideo }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative z-10 aspect-video w-full overflow-hidden rounded-xl shadow-2xl ring-offset-gray-950 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-4 sm:rounded-2xl">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${video.title}`}
      className="group relative z-10 block w-full cursor-pointer overflow-hidden rounded-xl shadow-2xl ring-offset-gray-950 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 sm:rounded-2xl"
    >
      <div className="relative aspect-video">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-105"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-black/20 transition-colors motion-reduce:transition-none group-hover:bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform motion-reduce:transition-none motion-safe:group-hover:scale-110 sm:h-20 sm:w-20">
            <Play
              aria-hidden="true"
              className="ml-1 h-6 w-6 fill-current sm:h-8 sm:w-8"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function BrushVideoFrame({ video }: { video: YoutubeVideo }) {
  return (
    <div className="relative isolate mx-auto aspect-[685/481] w-full max-w-3xl lg:max-w-none">
      <Image
        src="/images/brushy.svg"
        alt=""
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="pointer-events-none select-none object-contain opacity-80"
      />

      {/* These percentage insets match the transparent safe area within brushy.svg. */}
      <div className="absolute inset-x-[8%] top-[14%] z-10 flex h-[72%] items-center">
        <FeaturedPlayer video={video} />
      </div>
    </div>
  );
}

export default function LatestMessageClient({
  featuredVideo,
  otherVideos,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section className="relative overflow-hidden bg-gray-950 py-20">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header — collapsed */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Watch our latest message
          </h2>
          <Link
            href="/messages"
            className="inline-flex items-center rounded-sm text-sm text-gray-300 underline decoration-gray-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950 motion-reduce:transition-none sm:text-base"
          >
            Browse 500+ past messages
          </Link>
        </div>

        {/* Featured Message */}
        <div className="mb-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <BrushVideoFrame video={featuredVideo} />

          <div className="lg:pl-4">
            <h3 className="mb-4 mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              {featuredVideo.title}
            </h3>

            <p className="mb-6 text-base text-gray-400 sm:text-lg">
              {featuredVideo.publishedAt}
            </p>

            <Link
              href="/messages"
              className="inline-flex min-h-10 items-center rounded-full border border-white/30 bg-transparent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
            >
              Find a message
            </Link>
          </div>
        </div>

        {/* Other Messages Carousel */}
        <div className="relative">
          <div className="mb-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              aria-label="Previous messages"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5 text-white" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              aria-label="Next messages"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Carousel with right-edge fade mask */}
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4 lg:gap-6">
                {otherVideos.map((video) => (
                  <div
                    key={video.id}
                    className="w-[280px] flex-shrink-0 sm:w-[320px] lg:w-[360px]"
                  >
                    <Link
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                    >
                      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl">
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10 motion-reduce:transition-none" />
                        <div className="absolute inset-0 flex flex-col justify-end p-4">
                          <div>
                            <h4 className="text-lg font-bold leading-tight text-white">
                              {video.title}
                            </h4>
                            <p className="mt-1 text-sm text-white/70">
                              {video.publishedAt}
                            </p>
                          </div>
                        </div>
                        <div className="absolute right-3 top-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform motion-reduce:transition-none motion-safe:group-hover:scale-110">
                            <Play
                              aria-hidden="true"
                              className="ml-0.5 h-4 w-4 fill-current"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            {/* Right-edge fade affordance */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-gray-950 to-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
