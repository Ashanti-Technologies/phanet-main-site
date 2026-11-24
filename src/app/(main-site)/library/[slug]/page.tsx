import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Download, ExternalLink } from "lucide-react";
import { APP_CONFIG } from "@/constants";
import {
  coverSrc,
  downloadUrl,
  getPublishedPublication,
  readablePages,
} from "@/lib/library";
import { BookReader } from "../_components/BookReader";
import { TrackedLink } from "../_components/TrackedLink";

export const dynamic = "force-dynamic";

const KIND_LABEL = { BOOK: "Book", DEVOTIONAL: "Devotional", BOOKLET: "Booklet", MAGAZINE: "Magazine" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pub = await getPublishedPublication(slug);
  if (!pub) return {};
  const title = `${pub.title} by ${pub.author.name}`;
  const description = pub.description?.slice(0, 200) ?? `${KIND_LABEL[pub.kind]} by ${pub.author.name}.`;
  const cover = coverSrc(pub, 800);
  return {
    title,
    description,
    alternates: { canonical: `/library/${pub.slug}` },
    openGraph: {
      type: "book",
      url: `/library/${pub.slug}`,
      title,
      description,
      // A child openGraph replaces the root one, so the default image must be restated.
      images: [cover ? { url: cover, alt: pub.title } : { url: "/api/og", width: 1200, height: 630, alt: pub.title }],
    },
  };
}

export default async function PublicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pub = await getPublishedPublication(slug);
  if (!pub) notFound();

  const front = coverSrc(pub, 700);
  const pages = readablePages(pub);
  const download = downloadUrl(pub);
  const meta = [KIND_LABEL[pub.kind], pub.year, pub.pageCount && `${pub.pageCount} pages`].filter(Boolean);
  const track = { slug: pub.slug, title: pub.title, author: pub.author.name };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: pub.title,
    author: { "@type": "Person", name: pub.author.name },
    url: `${APP_CONFIG.siteUrl}/library/${pub.slug}`,
    ...(pub.description && { description: pub.description }),
    ...(front && { image: front }),
    ...(pub.pageCount && { numberOfPages: pub.pageCount }),
    ...(pub.year && { datePublished: String(pub.year) }),
    ...(pub.access === "FREE" && { isAccessibleForFree: true }),
  };

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Plain script, not components/JsonLd: next/script dedupes its fixed id against the root Organization block. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <Link href="/library" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Library
        </Link>

        <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-16">
          <div className="flex gap-4 md:flex-col">
            {front && (
              <div className="relative aspect-[5/7] w-1/2 overflow-hidden rounded-md shadow-2xl shadow-black/60 md:w-full">
                <Image src={front} alt={`${pub.title} front cover`} fill sizes="(min-width: 768px) 320px, 50vw" className="object-cover" priority />
              </div>
            )}
            {pub.backCoverUrl && (
              <div className="relative aspect-[5/7] w-1/2 overflow-hidden rounded-md opacity-90 md:w-2/3">
                <Image src={pub.backCoverUrl} alt={`${pub.title} back cover`} fill sizes="(min-width: 768px) 220px, 50vw" className="object-cover" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">{meta.join(" · ")}</p>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">{pub.title}</h1>
            {pub.subtitle && <p className="mt-2 text-xl text-gray-300">{pub.subtitle}</p>}
            <p className="mt-4 text-lg text-gray-300">
              by <span className="font-semibold text-white">{pub.author.name}</span>
              {pub.author.subtext && <span className="text-gray-500"> · {pub.author.subtext}</span>}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {pages.length > 0 && (
                <a href="#read" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-gray-950 hover:bg-gray-200">
                  <BookOpen className="h-5 w-5" />
                  {pub.access === "PAID" ? "Read a preview" : "Read online"}
                </a>
              )}
              {download && (
                <TrackedLink
                  href={download}
                  event="library_download_clicked"
                  properties={track}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </TrackedLink>
              )}
              {pub.access === "AMAZON" && pub.buyUrl && (
                <TrackedLink
                  href={pub.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  event="library_buy_clicked"
                  properties={{ ...track, store: "amazon" }}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-semibold text-gray-950 hover:bg-amber-300"
                >
                  <ExternalLink className="h-5 w-5" />
                  Buy on Amazon
                </TrackedLink>
              )}
            </div>
            {pub.access === "PAID" && (
              <p className="mt-3 text-sm text-gray-400">Buying online is coming soon.</p>
            )}

            {pub.description && (
              <div className="mt-10 max-w-2xl whitespace-pre-line text-gray-300 leading-relaxed">{pub.description}</div>
            )}
          </div>
        </div>
      </section>

      {pages.length > 0 && (
        <section id="read" className="scroll-mt-24 border-t border-white/5 bg-gray-900/50 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <BookReader pages={pages} totalPages={pub.pageCount ?? pages.length} />
          </div>
        </section>
      )}
    </main>
  );
}
