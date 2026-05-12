import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/database";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.contentPage.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  if (!page) return {};

  return {
    title: page.seoTitle || `${page.title} | Phanerosis Prayer Network`,
    description: page.seoDescription || page.summary || undefined,
  };
}

export default async function PublicContentPage({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.contentPage.findFirst({
    where: { slug, status: "PUBLISHED" },
  });

  if (!page) notFound();

  return (
    <main className="bg-background">
      <section className="border-b pt-32 pb-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-4 text-lg text-muted-foreground">{page.summary}</p>
          )}
        </div>
      </section>
      <section className="py-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {page.imageUrl && (
            <div className="relative mb-8 aspect-video overflow-hidden rounded-lg border">
              <Image
                src={page.imageUrl}
                alt={page.imageAlt || page.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
          />
        </div>
      </section>
    </main>
  );
}
