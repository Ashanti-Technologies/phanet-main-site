"use client";

import { motion } from "framer-motion";
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

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// Custom styles for Swiper
const swiperStyles = `
    .swiper-button-next,
    .swiper-button-prev {
        color: white;
        background: rgba(0, 0, 0, 0.3);
        width: 48px;
        height: 48px;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    
    .swiper-button-next:hover,
    .swiper-button-prev:hover {
        background: rgba(0, 0, 0, 0.5);
        transform: scale(1.1);
    }
    
    .swiper-button-next:after,
    .swiper-button-prev:after {
        font-size: 20px;
        font-weight: bold;
    }
    
    .swiper-pagination {
        bottom: 40px !important;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
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
        width: 32px;
        height: 8px;
        background: white;
        transform: none;
        border-radius: 4px;
    }
`;

const slides = [
  {
    id: 1,
    image: "/images/slider/giya1.jpg",
    title: "Global Prayer Movement",
    subtitle: "Join millions in prayer for the nations",
    cta: {
      text: "Connect with us",
      href: "/join",
    },
  },
  {
    id: 2,
    image: "/images/slider/hoe1.jpg",
    title: "United in Christ",
    subtitle: "Building a community of intercessors",
    cta: {
      text: "Connect with us",
      href: "/join",
    },
  },
  {
    id: 3,
    image: "/images/slider/hoe2.jpg",
    title: "Transform Lives",
    subtitle: "Through the power of prayer",
    cta: {
      text: "Connect with us",
      href: "/join",
    },
  },
];

export default function Hero() {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <style jsx global>
        {swiperStyles}
      </style>
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        modules={[Autoplay, Navigation, Pagination, EffectFade, Keyboard]}
        effect="fade"
        fadeEffect={{
          crossFade: true,
        }}
        zoom={{}}
        speed={2000}
        spaceBetween={0}
        slidesPerView={1}
        loop
        autoplay={{
          disableOnInteraction: true,
        }}
        // navigation={{
        //     prevEl: 'swiper-button-prev',
        //     nextEl: 'swiper-button-next',
        // }}
        // pagination={{
        //     clickable: true,
        //     renderBullet: function (index, className) {
        //         return `<span class="${className}"></span>`;
        //     },
        // }}
        className="w-full h-screen"
      >
        {/* <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="swiper-button-prev"
        ></button>
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="swiper-button-next"
        ></button> */}
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-screen">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
                  <motion.h1
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  >
                    {slide.title}
                  </motion.h1>

                  <motion.p
                    className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                  >
                    {slide.subtitle}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                    className="flex justify-center"
                  >
                    <Link
                      href={slide.cta.href}
                      className="inline-block bg-crayola hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105"
                    >
                      {slide.cta.text}
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
