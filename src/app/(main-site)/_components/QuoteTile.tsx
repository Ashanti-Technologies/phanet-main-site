"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Props = {
  delay?: number;
};

export default function QuoteTile({ delay = 0 }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className="col-span-2 relative rounded-2xl overflow-hidden min-h-[320px] lg:min-h-[380px] bg-midnight-green p-8 sm:p-10 flex flex-col justify-between"
    >
      {/* Decorative quotation glyph */}
      <span
        aria-hidden
        className="absolute -top-6 -left-2 text-[14rem] leading-none font-serif text-white/10 select-none"
      >
        “
      </span>

      <blockquote className="relative z-10 max-w-md">
        <p className="text-white text-xl sm:text-2xl lg:text-3xl font-medium leading-snug">
          I urge, then, first of all, that petitions, prayers, intercession and
          thanksgiving be made for all people.
        </p>
      </blockquote>

      <footer className="relative z-10 mt-6 flex items-center gap-3">
        <span className="h-px w-10 bg-white/40" />
        <span className="text-white/80 text-sm uppercase tracking-widest">
          1 Timothy 2:1
        </span>
      </footer>
    </motion.div>
  );
}
