import type { Metadata } from "next";
import { getLibraryShelves } from "@/lib/library";
import { AuthorShelf } from "./_components/AuthorShelf";

export const metadata: Metadata = {
  title: "Library | Phanerosis Prayer Network",
  description:
    "Books and devotionals written by pastors and members of the Phanerosis Prayer Network. Read online, download, or buy.",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { shelves, shared } = await getLibraryShelves();
  const empty = shelves.length === 0 && shared.length === 0;

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
            Written by the Network
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Library
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Books and devotionals by our pastors and members. Read online,
            download, or get your own copy.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-16">
        {empty && (
          <p className="py-16 text-center text-gray-400">The shelves are being stocked. Check back soon.</p>
        )}
        {shelves.map((s) => (
          <AuthorShelf key={s.id} name={s.name} subtext={s.subtext} avatarUrl={s.avatarUrl} books={s.books} />
        ))}
        {shared.length > 0 && (
          <AuthorShelf name={shelves.length ? "More from the network" : "From the network"} books={shared} />
        )}
      </section>
    </main>
  );
}
