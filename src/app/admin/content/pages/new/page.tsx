import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ContentPageForm } from "../_components/content-page-form";

export default function NewContentPagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Page</h1>
          <p className="text-muted-foreground">Create a CMS page.</p>
        </div>
      </div>
      <ContentPageForm />
    </div>
  );
}
