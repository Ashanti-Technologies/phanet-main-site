import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminAlbum, getEventOptions } from "@/actions/gallery";
import { Button } from "@/app/components/ui/button";
import { AlbumForm } from "../_components/album-form";
import { PhotoManager } from "../_components/photo-manager";

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, events] = await Promise.all([getAdminAlbum(id), getEventOptions()]);
  if (!album) notFound();
  const { photos, ...fields } = album;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/content/gallery">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="truncate text-3xl font-semibold tracking-tight">{album.title}</h1>
        </div>
        {album.status === "PUBLISHED" && (
          <Button variant="outline" asChild>
            <Link href={`/gallery/${album.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View
            </Link>
          </Button>
        )}
      </div>
      <PhotoManager
        albumId={album.id}
        coverPhotoId={album.coverPhotoId}
        photos={photos.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, caption: p.caption, hidden: p.hidden }))}
      />
      <AlbumForm album={fields} events={events} />
    </div>
  );
}
