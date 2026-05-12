import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { prisma } from "@/lib/database";
import MessagesGrid from "./_components/MessagesGrid";

export const metadata: Metadata = {
  title: "Messages | Phanerosis Prayer Network",
  description:
    "Watch and grow through PHANET's library of teachings from Elim Hour, Women in Travail, special services, and more.",
};

export const dynamic = "force-dynamic";

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

export default async function MessagesPage() {
  const curatedMessages = await prisma.sermonFeature.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    take: 3,
  });

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
        {curatedMessages.length > 0 && (
          <div className="mb-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
              Featured by PHANET
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {curatedMessages.map((message) => (
                <Link
                  key={message.id}
                  href={message.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-white/5 bg-gray-900 transition-colors hover:border-white/10"
                >
                  <div className="relative aspect-video bg-gray-800">
                    {message.thumbnailUrl && (
                      <Image
                        src={message.thumbnailUrl}
                        alt={message.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 fill-white text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500">
                      {message.publishedAt?.toLocaleDateString() || "Featured"}
                    </p>
                    <h2 className="mt-2 line-clamp-2 font-semibold text-white">
                      {message.title}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Suspense fallback={<GridSkeleton />}>
          <MessagesGrid />
        </Suspense>
      </section>
    </main>
  );
}
