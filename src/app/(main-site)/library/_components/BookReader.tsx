"use client";

import { forwardRef, useEffect, useRef, useState, useSyncExternalStore } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type BookSounds, createBookSounds } from "@/lib/book-sounds";

// Pages this far either side of the open spread get their image; the rest stay empty.
const LOAD_AHEAD = 4;
const DESKTOP = "(min-width: 768px)";

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

const Page = forwardRef<HTMLDivElement, { src?: string; n: number; children?: React.ReactNode }>(
  function Page({ src, n, children }, ref) {
    return (
      <div ref={ref} className="bg-white shadow-inner">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already sized and signed it
          <img src={src} alt={`Page ${n}`} draggable={false} className="h-full w-full object-contain" />
        )}
        {children}
      </div>
    );
  },
);

function PreviewEnd({ remaining }: { remaining: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-gray-700">
      <p className="text-lg font-semibold">End of the preview</p>
      <p className="text-sm">
        {remaining} more {remaining === 1 ? "page" : "pages"} in the full book. Online purchase is coming soon.
      </p>
    </div>
  );
}

export function BookReader({ pages, totalPages }: { pages: string[]; totalPages: number }) {
  const isDesktop = useIsDesktop();
  const remaining = totalPages - pages.length;

  if (!isDesktop) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        {pages.map((src, i) => (
          <div key={src} className="aspect-[5/7] overflow-hidden rounded-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already sized and signed it */}
            <img src={src} alt={`Page ${i + 1}`} loading="lazy" className="h-full w-full object-contain" />
          </div>
        ))}
        {remaining > 0 && (
          <div className="aspect-[5/7] rounded-sm bg-white">
            <PreviewEnd remaining={remaining} />
          </div>
        )}
      </div>
    );
  }

  return <FlipBook pages={pages} remaining={remaining} />;
}

function FlipBook({ pages, remaining }: { pages: string[]; remaining: number }) {
  // react-pageflip ships an untyped ref.
  const book = useRef<any>(null);
  const [current, setCurrent] = useState(0);
  const count = pages.length + (remaining > 0 ? 1 : 0);
  // Created on the first flip (always a user gesture, so audio is allowed).
  const sounds = useRef<BookSounds | null>(null);
  useEffect(() => () => sounds.current?.dispose(), []);

  return (
    <div className="space-y-4">
      {/* A spread is two 450×630 pages: cap the width so it fits below the header with the controls in view. */}
      <div className="mx-auto" style={{ maxWidth: "min(64rem, calc((100vh - 14rem) * 1.43))" }}>
        <HTMLFlipBook
          ref={book}
          className=""
          style={{}}
          startPage={0}
          size="stretch"
          width={450}
          height={630}
          minWidth={280}
          maxWidth={600}
          minHeight={392}
          maxHeight={840}
          drawShadow
          flippingTime={700}
          usePortrait
          startZIndex={0}
          autoSize
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          clickEventForward={false}
          useMouseEvents
          swipeDistance={30}
          showPageCorners
          disableFlipByClick={false}
          // onFlip fires as the page lands, however it was turned.
          onFlip={(e: { data: number }) => {
            setCurrent(e.data);
            sounds.current?.land();
          }}
          // A page starts moving: "flipping" for buttons/clicks, "user_fold" for a drag.
          onChangeState={(e: { data: string }) => {
            if (e.data === "flipping" || e.data === "user_fold") (sounds.current ??= createBookSounds()).lift();
          }}
        >
          {/* react-pageflip clones every child, so no `false`/null children allowed. */}
          {[
            ...pages.map((src, i) => (
              <Page key={src} n={i + 1} src={Math.abs(i - current) <= LOAD_AHEAD ? src : undefined} />
            )),
            ...(remaining > 0
              ? [
                  <Page key="preview-end" n={pages.length + 1}>
                    <PreviewEnd remaining={remaining} />
                  </Page>,
                ]
              : []),
          ]}
        </HTMLFlipBook>
      </div>
      <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
        <button
          type="button"
          onClick={() => book.current?.pageFlip()?.flipPrev()}
          disabled={current === 0}
          className="rounded-full border border-white/10 p-2 hover:bg-white/10 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="tabular-nums">
          {Math.min(current + 1, count)} / {count}
        </span>
        <button
          type="button"
          onClick={() => book.current?.pageFlip()?.flipNext()}
          disabled={current >= count - 1}
          className="rounded-full border border-white/10 p-2 hover:bg-white/10 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
