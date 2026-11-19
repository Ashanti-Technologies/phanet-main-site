"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "motion/react";

/**
 * A "you're done" moment: a confetti burst behind an animated check, plays
 * once. People who ask for reduced motion get a still check instead.
 *
 * Animations from LottieFiles, free under the Lottie Simple License
 * (https://lottiefiles.com/page/license):
 *   public/lottie/success-check.lottie: "success confetti" by Deepesh Reddy
 *   public/lottie/confetti.lottie: "confetti on transparent background" by Sportbank Design
 */
export function SuccessCelebration({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 pb-6 text-center text-emerald-900 dark:text-emerald-200 ${className ?? ""}`}
    >
      {!reduceMotion && (
        <DotLottieReact
          src="/lottie/confetti.lottie"
          autoplay
          layout={{ fit: "cover", align: [0.5, 0] }}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        />
      )}
      <div className="relative mx-auto h-28 w-28">
        {reduceMotion ? (
          <CheckCircle2 className="h-full w-full p-5 text-emerald-500" aria-hidden />
        ) : (
          <DotLottieReact src="/lottie/success-check.lottie" autoplay className="h-full w-full" aria-hidden />
        )}
      </div>
      <div className="relative text-lg font-semibold">{title}</div>
      {children && <div className="relative mt-1 space-y-1 text-sm">{children}</div>}
    </div>
  );
}
