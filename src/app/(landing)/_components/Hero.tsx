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
    overlay: {
      bottomLeft: (
        <>
          <h2 className="text-lg md:text-xl font-bold text-white">
            Phanerosis Prayer Network International
          </h2>
          <p className="text-sm md:text-base text-white/80">
            Raising 1 billion intercessors
          </p>
        </>
      ),
      buttons: [
        { text: "Get connected", href: "/join", variant: "primary" as const },
        { text: "Learn more", href: "/about", variant: "secondary" as const },
      ],
    },
  },
  {
    id: 2,
    image: "/images/slider/hoe1.jpg",
    overlay: {
      bottomLeft: (
        <>
          <h2 className="text-lg md:text-xl font-bold text-white">
            United in Christ
          </h2>
          <p className="text-sm md:text-base text-white/80">
            Building a community of intercessors
          </p>
        </>
      ),
      buttons: [
        { text: "Get connected", href: "/join", variant: "primary" as const },
        { text: "Learn more", href: "/about", variant: "secondary" as const },
      ],
    },
  },
  {
    id: 3,
    image: "/images/slider/hoe2.jpg",
    overlay: {
      bottomLeft: (
        <>
          <h2 className="text-lg md:text-xl font-bold text-white">
            Transform Lives
          </h2>
          <p className="text-sm md:text-base text-white/80">
            Through the power of prayer
          </p>
        </>
      ),
      buttons: [
        { text: "Get connected", href: "/join", variant: "primary" as const },
        { text: "Learn more", href: "/about", variant: "secondary" as const },
      ],
    },
  },
];

export default function Hero() {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="relative h-[75vh] flex items-center justify-center overflow-hidden">
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
        pagination={{
          clickable: true,
          renderBullet: function (_index, className) {
            return `<span class="${className}"></span>`;
          },
        }}
        className="w-full h-[75vh]"
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
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt={`Slide ${slide.id}`}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

              {/* Bottom Overlay Bar */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-12 py-20 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                  {/* Bottom Left Content */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                    className="flex flex-col gap-1"
                  >
                    {slide.overlay.bottomLeft}
                  </motion.div>

                  {/* Bottom Right Buttons */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                    className="flex gap-3"
                  >
                    {slide.overlay.buttons.map((button, index) => (
                      <Link
                        key={index}
                        href={button.href}
                        className={`
                          px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105
                          ${
                            button.variant === "primary"
                              ? "bg-crayola hover:bg-blue-700 text-white"
                              : "bg-white/10 hover:bg-white/20 text-white border border-white/30"
                          }
                        `}
                      >
                        {button.text}
                      </Link>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
