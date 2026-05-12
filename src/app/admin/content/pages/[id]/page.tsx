import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminContentPageById } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { ContentPageForm } from "../_components/content-page-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContentPagePage({ params }: Props) {
  const { id } = await params;
  const page = await getAdminContentPageById(id);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Page</h1>
          <p className="text-muted-foreground">{page.title}</p>
        </div>
      </div>
      <ContentPageForm page={page} />
    </div>
  );
}
