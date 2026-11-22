"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { CheckCircle2, Clock } from "lucide-react";
import { useReducedMotion } from "motion/react";

/**
 * The "you're done" screen shown instead of a finished form. Phone-first:
 * fills the visible height, message in the middle, big actions at the bottom
 * (thumb reach, clear of the home bar). `success` plays a confetti burst behind
 * an animated check once; `pending` shows a still clock. Reduced motion gets a
 * still check.
 *
 * Animations from LottieFiles, free under the Lottie Simple License
 * (https://lottiefiles.com/page/license):
 *   public/lottie/success-check.lottie: "success confetti" by Deepesh Reddy
 *   public/lottie/confetti.lottie: "confetti on transparent background" by Sportbank Design
 */
export function SuccessScreen({
  title,
  tone = "success",
  children,
  actions,
}: {
  title: React.ReactNode;
  tone?: "success" | "pending";
  children?: React.ReactNode;
  /** Full-width buttons/links, most important first. */
  actions?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const animate = tone === "success" && !reduceMotion;
  return (
    <div role="status" className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-2 py-6 text-center">
        {animate && (
          <DotLottieReact
            src="/lottie/confetti.lottie"
            autoplay
            layout={{ fit: "cover", align: [0.5, 0] }}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          />
        )}
        <div className="relative h-36 w-36">
          {animate ? (
            <DotLottieReact src="/lottie/success-check.lottie" autoplay className="h-full w-full" aria-hidden />
          ) : tone === "pending" ? (
            <Clock className="h-full w-full p-8 text-amber-500" aria-hidden />
          ) : (
            <CheckCircle2 className="h-full w-full p-6 text-emerald-500" aria-hidden />
          )}
        </div>
        <h1 className="relative font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {children && (
          <div className="relative mt-3 w-full max-w-md space-y-3 text-sm text-muted-foreground">{children}</div>
        )}
      </div>
      {actions && (
        // Not sticky: a stack of 4–5 actions covered the summary above it on
        // short phones. min-h on the wrapper still puts them at the bottom.
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {actions}
        </div>
      )}
    </div>
  );
}
