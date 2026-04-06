import type { Metadata } from "next";
import { Suspense } from "react";
import MessagesGrid from "./_components/MessagesGrid";

export const metadata: Metadata = {
  title: "Messages | Phanerosis Prayer Network",
  description:
    "Watch and grow through PHANET's library of teachings from Elim Hour, Women in Travail, special services, and more.",
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden bg-gray-900 border border-white/5 animate-pulse"
        >
          <div className="aspect-video bg-gray-800" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-16 bg-gray-800 rounded" />
            <div className="h-4 w-full bg-gray-800 rounded" />
            <div className="h-4 w-3/4 bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="relative bg-gray-950 pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">
            Grow in Your Faith
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Messages
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Teachings from Elim Hour, Women in Travail, special services, and
            more — available for free on our YouTube channel.
          </p>
        </div>
      </section>

      {/* Grid with infinite scroll */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Suspense fallback={<GridSkeleton />}>
          <MessagesGrid />
        </Suspense>
      </section>
    </main>
  );
}
