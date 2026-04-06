"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { YoutubeVideo } from "@/lib/youtube";

type Props = {
  featuredVideo: YoutubeVideo;
  otherVideos: YoutubeVideo[];
};

export default function LatestMessageClient({
  featuredVideo,
  otherVideos,
}: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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
    <section className="relative py-20 overflow-hidden bg-gray-950">
      {/* Dotted pattern overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">
            Discover a Message
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 mb-2">
            Watch Our Latest Message
          </h2>
          <p className="text-xl text-crayola font-medium">
            + Over 500 Past Messages
          </p>
        </motion.div>

        {/* Featured Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16"
        >
          {/* Video Thumbnail with Brushy Overlay */}
          <div className="relative">
            {/* Brushy SVG Background */}
            <div className="absolute -right-8 -top-8 w-[120%] h-[120%] z-0 opacity-60">
              <Image
                src="/images/brushy.svg"
                alt=""
                fill
                className="object-contain"
              />
            </div>

            {/* Video Thumbnail */}
            <Link
              href={featuredVideo.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 rounded-2xl overflow-hidden shadow-2xl group cursor-pointer block"
            >
              <div className="relative aspect-video">
                <Image
                  src={featuredVideo.thumbnailUrl}
                  alt={featuredVideo.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-crayola rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Message Details */}
          <div className="lg:pl-4">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-3 mb-4">
              {featuredVideo.title}
            </h3>

            <p className="text-gray-400 text-base sm:text-lg mb-6">
              {featuredVideo.publishedAt}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href={featuredVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 rounded-full font-medium text-sm bg-crayola text-white hover:bg-blue-700 transition-all duration-300 hover:scale-105"
              >
                Watch Message
              </Link>
              <Link
                href="/messages"
                className="inline-flex items-center px-6 py-3 rounded-full font-medium text-sm bg-transparent text-white border border-white/30 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                Find a Message
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Other Messages Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative"
        >
          {/* Carousel Navigation */}
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Previous messages"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Next messages"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Embla Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4 lg:gap-6">
              {otherVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[360px]"
                >
                  <Link
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="relative rounded-xl overflow-hidden aspect-video mb-3">
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                      {/* Title Overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <div>
                          <h4 className="text-white text-lg font-bold leading-tight">
                            {video.title}
                          </h4>
                          <p className="text-white/70 text-sm mt-1">
                            {video.publishedAt}
                          </p>
                        </div>
                      </div>

                      {/* Play Button */}
                      <div className="absolute top-3 right-3">
                        <div className="w-10 h-10 bg-crayola rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
