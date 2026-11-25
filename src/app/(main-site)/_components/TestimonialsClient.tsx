"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  imageUrl: string | null;
};

const ACCENTS = ["bg-cerulean", "bg-crayola", "bg-midnight-green", "bg-mikado-yellow"];

function Avatar({ t, accent }: { t: Testimonial; accent: string }) {
  const [errored, setErrored] = useState(false);

  if (!t.imageUrl || errored) {
    return (
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${accent} text-white text-lg font-bold`}
        aria-hidden
      >
        {t.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-gray-100">
      <Image
        src={t.imageUrl}
        alt={t.name}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export default function TestimonialsClient({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
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
              key={t.id}
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
                <Avatar t={t} accent={ACCENTS[index % ACCENTS.length]} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{t.name}</p>
                  {t.role && (
                    <p className="text-sm text-gray-500 truncate">{t.role}</p>
                  )}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
