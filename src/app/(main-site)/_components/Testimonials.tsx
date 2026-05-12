"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";

type Testimonial = {
  name: string;
  role: string;
  title: string;
  quote: string;
  image: string;
  accent: string; // initials-avatar background
};

const testimonials: Testimonial[] = [
  {
    name: "Stefan",
    role: "Intercessor",
    title: "Member, Diaspora Chapter",
    quote:
      "PHANET reframed prayer for me. It stopped being an obligation and became the place I show up every week to be reshaped.",
    image: "/images/testimonials/stefan.webp",
    accent: "bg-cerulean",
  },
  {
    name: "George",
    role: "Worship Leader",
    title: "Member, Accra Chapter",
    quote:
      "I came in carrying questions and left carrying conviction. The teaching is Christ-centred and the community is real.",
    image: "/images/testimonials/george.webp",
    accent: "bg-crayola",
  },
  {
    name: "Esther",
    role: "Campus Coordinator",
    title: "Member, University Chapter",
    quote:
      "Joining Elim Hour as a student changed the trajectory of my walk. I learned to stand in the gap for my generation.",
    image: "/images/testimonials/esther.webp",
    accent: "bg-midnight-green",
  },
  {
    name: "Beryl",
    role: "Prayer Coordinator",
    title: "Member, UK Chapter",
    quote:
      "PHANET is family. Across continents and time zones, I have brothers and sisters carrying my burdens with me.",
    image: "/images/testimonials/beryl.webp",
    accent: "bg-mikado-yellow",
  },
];

function Avatar({ t }: { t: Testimonial }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${t.accent} text-white text-lg font-bold`}
        aria-hidden
      >
        {t.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-gray-100">
      <Image
        src={t.image}
        alt={t.name}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export default function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-antiflash-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest">
            From the family
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mt-3 mb-4">
            Stories from the network
          </h2>
          <p className="text-lg text-gray-600">
            What members of the PHANET family have to say about life in the
            network.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((t, index) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={
                isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
              }
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-100 flex flex-col"
            >
              <blockquote className="text-gray-800 text-base sm:text-lg leading-relaxed flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                <Avatar t={t} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {t.role} · {t.title}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
