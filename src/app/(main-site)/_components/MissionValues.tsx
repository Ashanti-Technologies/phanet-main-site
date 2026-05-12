"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type Value = {
  id: number;
  slug: string;
  title: string;
  description: string;
  color: string;
  span: string;
};

const values: Value[] = [
  {
    id: 1,
    slug: "intercession",
    title: "Intercession for the Lost",
    description:
      "Dedicated to praying for those who have not yet found Christ.",
    color: "bg-midnight-green",
    span: "lg:col-span-3",
  },
  {
    id: 2,
    slug: "teachings",
    title: "Christ-Centred Teachings",
    description: "Rooted in biblical truth and the teachings of Jesus.",
    color: "bg-crayola",
    span: "lg:col-span-3",
  },
  {
    id: 3,
    slug: "sacrifice",
    title: "Sacrifice for the Kingdom",
    description: "Committed to serving God's purpose above all else.",
    color: "bg-cerulean",
    span: "lg:col-span-2",
  },
  {
    id: 4,
    slug: "love",
    title: "Love for God and the Brethren",
    description: "Building a community of love and support.",
    color: "bg-black",
    span: "lg:col-span-2",
  },
  {
    id: 5,
    slug: "unity",
    title: "Unity of the Body of Christ",
    description: "Working together as one in Christ.",
    color: "bg-mikado-yellow text-gray-900",
    span: "lg:col-span-2",
  },
];

export default function MissionValues() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const isInView = useInView(ref, { once: true });
  const isVideoInView = useInView(videoRef, { once: true });
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section ref={ref} className="py-24 px-4 bg-antiflash-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Our Mission & Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              To reach the unreached, strengthen the weak, and support the
              strong through intercession, fellowship, study of the Word, and
              witnessing.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {values.map((value, index) => {
              const isYellow = value.color.includes("mikado-yellow");
              const onCard = isYellow ? "text-gray-900" : "text-white";
              const onCardMuted = isYellow ? "text-gray-800" : "text-white/90";
              return (
                <motion.div
                  key={value.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 20 }
                  }
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={value.span}
                >
                  <Link href={`/values#${value.slug}`} className="block h-full">
                    <div
                      className={`${value.color} rounded-2xl p-8 h-[280px] relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                    >
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                      </div>

                      <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                          <h4
                            className={`text-2xl md:text-3xl font-bold ${onCard} leading-tight`}
                          >
                            {value.title}
                          </h4>
                          <p className={`mt-4 ${onCardMuted} text-base md:text-lg`}>
                            {value.description}
                          </p>
                        </div>

                        <div
                          className={`flex items-center ${onCard} group-hover:translate-x-2 transition-transform duration-300`}
                        >
                          Learn more
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 ml-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={videoRef} className="relative h-[600px] overflow-hidden">
        {/* Background video (or static fallback when reduced motion is set) */}
        <div className="absolute inset-0">
          {reduceMotion ? (
            <Image
              src="/images/landing/happy2.webp"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/images/landing/happy2.webp"
              className="object-cover w-full h-full"
            >
              <source src="/videos/snippet.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={
                isVideoInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.8 }}
              className="max-w-3xl"
            >
              <span className="text-xl text-white/90 font-medium mb-4 block">
                Kingdom Mandate
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Raising and deploying Kingdom emissaries to transform every
                sphere of society.
              </h2>
              <Link
                href="/join"
                className="inline-flex items-center text-white text-lg font-medium group"
              >
                Become an intercessor
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
