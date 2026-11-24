import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminLibrary } from "@/actions/library";
import { Button } from "@/app/components/ui/button";
import { AuthorForm } from "../_components/author-form";

export default async function AdminLibraryAuthorsPage() {
  const { authors } = await getAdminLibrary();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/library">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Authors</h1>
          <p className="text-sm text-muted-foreground">
            Each author with 2+ published books gets their own shelf, in this order.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {authors.map((author) => (
          <AuthorForm key={author.id} author={author} bookCount={author._count.publications} />
        ))}
        <AuthorForm />
      </div>
    </div>
  );
}
