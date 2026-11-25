import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HandHeart, Users } from "lucide-react";
import { getProjects } from "@/actions/projects";
import { getPostHogClient } from "@/lib/posthog-server";
import { getServerAuthSession } from "@/lib/auth";

const description =
  "Partner with the Phanerosis Prayer Network on kingdom projects raising one billion intercessors worldwide.";

export const metadata: Metadata = {
  title: "Projects", // root layout template appends the site name
  description,
  alternates: { canonical: "/projects" },
};

export const dynamic = "force-dynamic";

const fundingModeLabels = {
  SINGLE_SPONSOR: "Looking for a sponsor",
  MULTI_CONTRIBUTOR: "Open for contributions",
};

export default async function ProjectsListingPage() {
  const [projects, session] = await Promise.all([
    getProjects({ status: "ACTIVE", includeCommitments: true }),
    getServerAuthSession(),
  ]);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session?.user?.id ?? "anonymous",
    event: "projects_list_viewed",
    properties: {
      project_count: projects.length,
    },
  });

  return (
    <main>
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-20">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6 lg:px-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Kingdom Projects
          </span>
          <h1 className="mt-3 mb-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Build with us.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300 sm:text-xl">
            Partner with us to advance the Gospel through strategic initiatives. Every contribution
            helps raise one billion intercessors worldwide.
          </p>
        </div>
      </section>

      <section className="min-h-[50vh] bg-gray-50">
        <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <HandHeart className="mx-auto h-14 w-14 text-gray-300" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">No active projects right now</h2>
              <p className="mt-2 text-gray-500">
                New projects will appear here. Meanwhile, you can still{" "}
                <Link href="/give" className="font-medium text-crayola hover:underline">
                  give online
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const target = Number(project.targetAmount);
                const raised = project.amountRaised;
                const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
                const firstImage = project.images[0];

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-48 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-950 sm:h-52">
                      {firstImage ? (
                        <Image
                          src={firstImage.url}
                          alt={project.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <HandHeart className="h-12 w-12 text-white/20" />
                        </div>
                      )}
                      <span className="absolute top-4 right-4 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-900 shadow">
                        {fundingModeLabels[project.fundingMode]}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg leading-snug font-bold text-gray-900 transition-colors group-hover:text-crayola">
                        {project.title}
                      </h3>
                      <p className="mb-5 line-clamp-2 flex-1 text-sm text-gray-500">
                        {project.description}
                      </p>

                      <div className="mb-5 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-gray-900">
                            GH₵ {raised.toLocaleString()} raised
                          </span>
                          <span className="text-gray-500">of GH₵ {target.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-crayola" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{progress.toFixed(0)}% funded</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.commitments?.length ?? 0} supporters
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-crayola transition-all group-hover:gap-2">
                        View project <span className="text-base">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
