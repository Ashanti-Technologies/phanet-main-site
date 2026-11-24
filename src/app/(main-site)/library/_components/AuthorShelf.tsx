"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bookshelf } from "@/app/components/motion/bookshelf";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import type { ShelfBook } from "@/lib/library";

const SHELF_HEIGHT = 260;

const ACCESS_NOTE: Record<ShelfBook["access"], string> = {
  FREE: "Free to read",
  AMAZON: "Available on Amazon",
  PAID: "Preview available",
};

function initials(name: string) {
  return name
    .replace(/^(rev|dr|pastor|prophet|apostle|bishop|mrs?|ms)\.?\s+/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function AuthorShelf({
  name,
  subtext,
  avatarUrl,
  books,
}: {
  name: string;
  subtext?: string | null;
  /** Omitted for the shared shelf, which has a plain heading instead. */
  avatarUrl?: string | null;
  books: ShelfBook[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = books.find((b) => b.id === openId);
  const isAuthor = avatarUrl !== undefined;
  // On an author's own shelf the name is in the header, so spines show just the title.
  const shelfBooks = isAuthor ? books.map((b) => ({ ...b, author: undefined })) : books;
  // Hug the books (plus room for one open cover) so the plank isn't a mostly empty bar.
  const shelfWidth =
    books.reduce((w, b) => w + b.thickness + 3, 0) + Math.round(SHELF_HEIGHT * 0.68) + 32 + 96;

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-4">
        {isAuthor && (
          <Avatar className="h-14 w-14 ring-2 ring-white/10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-gray-800 text-white">{initials(name)}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white sm:text-2xl">{name}</h2>
          <p className="text-sm text-gray-400">
            {[subtext, `${books.length} ${books.length === 1 ? "book" : "books"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-full" style={{ width: shelfWidth }}>
        <Bookshelf books={shelfBooks} value={openId} onValueChange={setOpenId} height={SHELF_HEIGHT} sound />
        {/* The plank the books stand on. */}
        <div className="-mt-8 h-3 rounded-sm bg-gradient-to-b from-amber-900 to-amber-950 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.8)]" />
      </div>

      <div aria-live="polite" className="min-h-[5.5rem]">
        {open ? (
          <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-gray-900 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-white">{open.title}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                {ACCESS_NOTE[open.access]}
              </p>
              {open.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-400">{open.description}</p>
              )}
            </div>
            <Link
              href={`/library/${open.slug}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-200"
            >
              Open book
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="pt-2 text-center text-sm text-gray-500">Tap a book to take it off the shelf.</p>
        )}
      </div>
    </section>
  );
}
