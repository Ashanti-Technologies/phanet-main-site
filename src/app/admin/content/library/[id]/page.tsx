import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminPublication, getAuthorOptions } from "@/actions/library";
import { Button } from "@/app/components/ui/button";
import { PublicationForm } from "../_components/publication-form";

export default async function EditPublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [publication, authors] = await Promise.all([getAdminPublication(id), getAuthorOptions()]);
  if (!publication) notFound();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/content/library">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="truncate text-3xl font-semibold tracking-tight">{publication.title}</h1>
        </div>
        {publication.status === "PUBLISHED" && (
          <Button variant="outline" asChild>
            <Link href={`/library/${publication.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View
            </Link>
          </Button>
        )}
      </div>
      <PublicationForm publication={publication} authors={authors} />
    </div>
  );
}
