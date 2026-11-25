import type { Metadata } from "next";
import { getProjectById } from "@/actions/projects";
import { getThankYouWallData } from "@/actions/commitments";
import { notFound } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";
import { getServerAuthSession } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/app/components/ui/carousel";
import { ArrowLeft, CheckCircle, Heart, MapPin, Target, Users } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const fundingModeLabels = {
  SINGLE_SPONSOR: "Looking for a sponsor",
  MULTI_CONTRIBUTOR: "Open for contributions",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectById((await params).id);
  if (!project || project.status !== "ACTIVE") return { title: "Project not found" };
  return {
    title: project.title,
    description: project.description.slice(0, 160),
    alternates: { canonical: `/projects/${project.id}` },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project || project.status !== "ACTIVE") {
    notFound();
  }

  const [thankYouData, session] = await Promise.all([
    getThankYouWallData(id),
    getServerAuthSession(),
  ]);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session?.user?.id ?? "anonymous",
    event: "project_viewed",
    properties: {
      project_id: project.id,
      project_title: project.title,
      funding_mode: project.fundingMode,
      supporter_count: project.commitments.length,
    },
  });

  const target = Number(project.targetAmount);
  const raised = project.amountRaised;
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const cover = project.images[0];

  return (
    <main>
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-16">
        {cover ? (
          <Image src={cover.url} alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
        ) : (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-900/60 to-gray-950" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/projects"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All projects
          </Link>
          <span className="mb-4 block w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-900">
            {fundingModeLabels[project.fundingMode]}
          </span>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {project.title}
          </h1>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
          <div className="min-w-0 space-y-10">
            {project.images.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-gray-100">
                <Carousel className="w-full">
                  <CarouselContent>
                    {project.images.map((image, index) => (
                      <CarouselItem key={image.id}>
                        <div className="relative aspect-video">
                          <Image
                            src={image.url}
                            alt={`${project.title} - Image ${index + 1}`}
                            fill
                            sizes="(min-width: 1024px) 66vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {project.images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                    </>
                  )}
                </Carousel>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">About this project</h2>
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700">{project.description}</p>
            </div>

            {project.proofUploads.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Progress updates
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.proofUploads.map((proof) => (
                    <div key={proof.id} className="overflow-hidden rounded-2xl bg-antiflash-white">
                      <div className="relative aspect-video">
                        <Image
                          src={proof.imageUrl}
                          alt="Progress update"
                          fill
                          sizes="(min-width: 640px) 33vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-1 p-4">
                        {proof.note && <p className="text-sm text-gray-700">{proof.note}</p>}
                        <p className="text-xs text-gray-500">
                          {new Date(proof.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {thankYouData.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <Heart className="h-6 w-6 text-crayola" />
                  Our supporters
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {thankYouData.slice(0, 6).map((supporter) => (
                    <div key={supporter.id} className="flex items-center gap-3 rounded-2xl bg-antiflash-white p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crayola/15 font-semibold text-crayola">
                        {supporter.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{supporter.fullName}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {supporter.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {thankYouData.length > 6 && (
                  <Link
                    href="/projects/thank-you"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-crayola transition-all hover:gap-2"
                  >
                    View all supporters <span className="text-base">→</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <aside>
            <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:sticky lg:top-28">
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-3xl font-bold text-gray-900">GH₵ {raised.toLocaleString()}</span>
                  <span className="text-gray-500">of GH₵ {target.toLocaleString()}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-crayola" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{progress.toFixed(0)}% funded</span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Users className="h-4 w-4" />
                    {project.commitments.length} supporters
                  </span>
                </div>
              </div>

              <Link
                href={`/projects/${project.id}/commit`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-crayola px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-600"
              >
                <Heart className="h-5 w-5" />
                Make a commitment
              </Link>
              <p className="text-center text-xs text-gray-500">
                You&apos;ll sign in with Google to complete your commitment.
              </p>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-6">
                <div className="rounded-xl bg-antiflash-white p-4 text-center">
                  <Target className="mx-auto h-5 w-5 text-crayola" />
                  <p className="mt-2 text-lg font-bold text-gray-900">GH₵ {target.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Goal</p>
                </div>
                <div className="rounded-xl bg-antiflash-white p-4 text-center">
                  <Users className="mx-auto h-5 w-5 text-crayola" />
                  <p className="mt-2 text-lg font-bold text-gray-900">{project.commitments.length}</p>
                  <p className="text-xs text-gray-500">Supporters</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
