import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { getEventOptions } from "@/actions/gallery";
import { Button } from "@/app/components/ui/button";
import { AlbumForm } from "../_components/album-form";

export default async function NewAlbumPage() {
  await requirePermission("create", "GalleryAlbum");
  const events = await getEventOptions();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/gallery">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">New album</h1>
      </div>
      <AlbumForm events={events} />
    </div>
  );
}
