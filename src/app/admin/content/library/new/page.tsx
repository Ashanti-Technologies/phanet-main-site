import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { getAuthorOptions } from "@/actions/library";
import { Button } from "@/app/components/ui/button";
import { PublicationForm } from "../_components/publication-form";

export default async function NewPublicationPage() {
  await requirePermission("create", "Publication");
  const authors = await getAuthorOptions();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/library">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">New book</h1>
      </div>
      <PublicationForm authors={authors} />
    </div>
  );
}
