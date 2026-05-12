"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Swiper as SwiperType } from "swiper";
import {
  Autoplay,
  Navigation,
  Pagination,
  EffectFade,
  Keyboard,
} from "swiper/modules";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

const swiperStyles = `
    .swiper-pagination {
        bottom: 32px !important;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        border-radius: 24px;
        width: auto !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
    }

    .swiper-pagination-bullet {
        width: 8px;
        height: 8px;
        background: rgba(255, 255, 255, 0.5);
        opacity: 1;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin: 0 !important;
    }

    .swiper-pagination-bullet-active {
        width: 28px;
        height: 8px;
        background: white;
        transform: none;
        border-radius: 4px;
    }
`;

type Slide = {
  id: number;
  image: string;
  eyebrow: string;
  headline: string;
  ctas: {
    primary: { text: string; href: string };
    secondary: { text: string; href: string };
  };
};

const slides: Slide[] = [
  {
    id: 1,
    image: "/images/slider/giya1.jpg",
    eyebrow: "Phanerosis Prayer Network International",
    headline: "Raising one billion intercessors.",
    ctas: {
      primary: { text: "Join Elim Hour", href: "/messages" },
      secondary: { text: "Our values", href: "/values" },
    },
  },
  {
    id: 2,
    image: "/images/slider/hoe1.jpg",
    eyebrow: "A global family of intercessors",
    headline: "United in Christ. Standing in the gap.",
    ctas: {
      primary: { text: "Find an event", href: "/events" },
      secondary: { text: "About PHANET", href: "/about" },
    },
  },
  {
    id: 3,
    image: "/images/slider/hoe2.jpg",
    eyebrow: "From private devotion to kingdom impact",
    headline: "Transform lives through prayer.",
    ctas: {
      primary: { text: "Become an intercessor", href: "/join" },
      secondary: { text: "Watch a message", href: "/messages" },
    },
  },
];

export default function Hero() {
  const swiperRef = useRef<SwiperType | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative h-[85vh] min-h-[560px] flex items-center justify-center overflow-hidden">
      <style jsx global>
        {swiperStyles}
      </style>
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        modules={[Autoplay, Navigation, Pagination, EffectFade, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1200}
        spaceBetween={0}
        slidesPerView={1}
        loop
        autoplay={
          reduceMotion
            ? false
            : {
                delay: 7000,
                pauseOnMouseEnter: true,
                disableOnInteraction: false,
              }
        }
        pagination={{
          clickable: true,
          renderBullet: function (_index, className) {
            return `<span class="${className}"></span>`;
          },
        }}
        keyboard={{ enabled: true }}
        className="w-full h-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt=""
                fill
                className="object-cover"
                priority={slide.id === 1}
              />
              {/* Single bottom-anchored gradient — no full-image overlay */}
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

              {/* Content stack — bottom-left */}
              <div className="absolute inset-0 z-10 flex items-end">
                <div className="container mx-auto px-6 sm:px-8 lg:px-12 pb-24 sm:pb-28">
                  <div className="max-w-3xl">
                    <motion.span
                      key={`eyebrow-${slide.id}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="block text-xs sm:text-sm uppercase tracking-widest text-white/70 mb-4"
                    >
                      {slide.eyebrow}
                    </motion.span>
                    <motion.h1
                      key={`headline-${slide.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.2 }}
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] text-balance"
                    >
                      {slide.headline}
                    </motion.h1>
                    <motion.div
                      key={`ctas-${slide.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.35 }}
                      className="mt-8 flex flex-wrap gap-3"
                    >
                      <Link
                        href={slide.ctas.primary.href}
                        className="px-6 py-3 rounded-full font-medium text-sm sm:text-base bg-crayola hover:bg-crayola/90 text-white transition-colors"
                      >
                        {slide.ctas.primary.text}
                      </Link>
                      <Link
                        href={slide.ctas.secondary.href}
                        className="px-6 py-3 rounded-full font-medium text-sm sm:text-base bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-colors backdrop-blur-sm"
                      >
                        {slide.ctas.secondary.text}
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
