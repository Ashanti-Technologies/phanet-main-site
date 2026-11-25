import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProjectById } from "@/actions/projects";
import { CommitForm } from "./_components/commit-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Make a commitment" };

export default async function CommitmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project || project.status !== "ACTIVE") notFound();

  return (
    <main>
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-14">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/projects/${project.id}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Link>
          <span className="block text-sm font-semibold uppercase tracking-widest text-gray-400">
            Make a commitment
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {project.title}
          </h1>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
          <div className="rounded-2xl bg-antiflash-white p-6 sm:p-8">
            <CommitForm projectId={project.id} />
          </div>
          <aside className="space-y-6 text-gray-700">
            <div>
              <h2 className="text-lg font-bold text-gray-900">How it works</h2>
              <p className="mt-2 text-sm">
                Tell us how much you&apos;d like to commit. We&apos;ll follow up with payment details, and
                you can also pay your pledge online from your member portal.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Prefer a one-off gift?</h2>
              <p className="mt-2 text-sm">
                You can{" "}
                <Link href="/give" className="font-medium text-crayola hover:underline">
                  give online
                </Link>{" "}
                by Mobile Money, card or bank.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
