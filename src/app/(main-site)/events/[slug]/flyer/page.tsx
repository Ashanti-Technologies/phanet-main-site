import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HOE } from "@/lib/event-subdomain";
import { FlyerMaker } from "./_components/flyer-maker";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TITLE = "I'm repping Heaven on Earth Camp 2026";
const DESCRIPTION = "Add your photo and name to make your own Heaven on Earth Camp 2026 flyer, then share it on your status.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== HOE.slug) return {};
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `/events/${slug}/flyer` },
    openGraph: { title: TITLE, description: DESCRIPTION, url: `/events/${slug}/flyer` },
  };
}

// The artwork is specific to Heaven on Earth 2026, so only that event has a flyer page.
export default async function FlyerPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (slug !== HOE.slug) notFound();
  const { name } = await searchParams;

  return (
    <main>
      <section className="bg-gradient-to-br from-sky-100 via-background to-amber-50 pt-32 pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/events/${slug}`}
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Heaven on Earth Camp 2026
          </Link>
          <h1 className="max-w-3xl font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            I&apos;m repping Heaven on Earth Camp 2026
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Add your photo and name to get your own camp flyer. Save it, then post it on your status and tell your people
            you&apos;ll be there.
          </p>
        </div>
      </section>
      <section className="bg-background py-10 sm:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FlyerMaker defaultName={typeof name === "string" ? name.slice(0, 28) : ""} />
        </div>
      </section>
    </main>
  );
}
