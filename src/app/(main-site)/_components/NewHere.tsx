"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// Configuration for the cards - easily customizable
const cards = {
  featured: {
    label: "THIS WEEK",
    title: "Elim Hour",
    description:
      "Join us every Sunday evening @7PM for our weekly online service. Experience spiritual growth together.",
    buttons: [
      { text: "Join Now", href: "/join", variant: "dark" as const },
      { text: "Learn More", href: "/programs", variant: "outline" as const },
    ],
    bgColor: "bg-crayola",
  },
  highlight: {
    image: "/images/landing/happy2.webp",
    alt: "Prayer requests on a wall",
  },
  community: {
    label: "NEW HERE?",
    title: "Find Your Community",
    description:
      "You are welcome at PHANET! Find a community of intercessors, get connected, and join our family.",
    button: { text: "Get Connected", href: "/join" },
    image: "/images/landing/happy.webp",
  },
  leader: {
    image: "/images/landing/founder.webp",
    label: "HI! I'M THE CHAIRMAN",
    name: "Dr. Godfred Bonnah Nkansah",
    message: "I would love to get to know you!",
    button: { text: "Email Me", href: "mailto:contact@phanerosisnetwork.com" },
  },
};

export default function NewHere() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Welcome to PHANET
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you&apos;re new to prayer or a seasoned intercessor,
            there&apos;s a place for you here. Discover how you can get
            involved.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Featured Card - Top Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`${cards.featured.bgColor} col-span-2 rounded-2xl p-8 flex flex-col justify-between min-h-[320px] lg:min-h-[380px]`}
          >
            <div>
              <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                {cards.featured.label}
              </span>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
                {cards.featured.title}
              </h3>
              <p className="text-white/90 text-base">
                {cards.featured.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              {cards.featured.buttons.map((btn, index) => (
                <Link
                  key={index}
                  href={btn.href}
                  className={`
                    px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 hover:scale-105
                    ${
                      btn.variant === "dark"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-transparent text-white border-2 border-white hover:bg-white/10"
                    }
                  `}
                >
                  {btn.text}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Highlight Image Card - Top Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-2 relative rounded-2xl overflow-hidden min-h-[320px] lg:min-h-[380px]"
          >
            <Image
              src={cards.highlight.image}
              alt={cards.highlight.alt}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </motion.div>

          {/* Community Card - Bottom Left (Spans 2 columns on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative rounded-2xl overflow-hidden min-h-[320px] lg:min-h-[380px] md:col-span-2 lg:col-span-3"
          >
            <Image
              src={cards.community.image}
              alt="Community gathering"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                {cards.community.label}
              </span>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3">
                {cards.community.title}
              </h3>
              <p className="text-white/90 text-base max-w-md mb-6">
                {cards.community.description}
              </p>
              <Link
                href={cards.community.button.href}
                className="inline-block w-fit px-6 py-3 rounded-full font-medium text-sm bg-crayola text-white hover:bg-blue-700 transition-all duration-300 hover:scale-105"
              >
                {cards.community.button.text}
              </Link>
            </div>
          </motion.div>

          {/* Leader Card - Bottom Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl overflow-hidden shadow-lg min-h-[320px] lg:min-h-[380px] flex flex-col md:col-span-2 lg:col-span-1"
          >
            <div className="relative h-40 lg:h-48">
              <Image
                src={cards.leader.image}
                alt={cards.leader.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 flex flex-col flex-1 justify-between">
              <div>
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
                  {cards.leader.label}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {cards.leader.name}
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  {cards.leader.message}
                </p>
              </div>
              <Link
                href={cards.leader.button.href}
                className="inline-block w-fit px-6 py-2.5 rounded-full font-medium text-sm bg-crayola text-white hover:bg-blue-700 transition-all duration-300 hover:scale-105 mt-4"
              >
                {cards.leader.button.text}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
