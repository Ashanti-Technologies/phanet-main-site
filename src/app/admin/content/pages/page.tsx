import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminContentPages } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { PagesTable } from "./_components/pages-table";

export default async function AdminContentPagesPage() {
  const pages = await getAdminContentPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">Manage reusable website pages.</p>
        </div>
        <Button asChild>
          <Link href="/admin/content/pages/new">
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All pages</CardTitle>
        </CardHeader>
        <CardContent>
          <PagesTable pages={pages} />
        </CardContent>
      </Card>
    </div>
  );
}
