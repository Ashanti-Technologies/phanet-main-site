"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { addPhotos, deletePhoto, reorderPhotos, setAlbumCover, signGalleryUpload, updatePhotoCaption } from "@/actions/gallery";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from "@/app/components/ui/sortable";

type Photo = { id: string; thumbUrl: string; caption: string | null; hidden: boolean };
type Uploaded = { publicId: string; width: number; height: number };

const CONCURRENCY = 3;

export function PhotoManager({ albumId, coverPhotoId, photos: initial }: { albumId: string; coverPhotoId: string | null; photos: Photo[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Server data wins after a refresh (uploads, deletes).
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setPhotos(initial);
  }

  async function upload(files: File[]) {
    setError(null);
    setProgress({ done: 0, total: files.length, failed: 0 });
    const s = await signGalleryUpload();
    const uploaded: Uploaded[] = [];
    let failed = 0;
    const queue = [...files];

    async function worker() {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          const body = new FormData();
          body.append("file", file);
          body.append("api_key", s.apiKey);
          body.append("timestamp", String(s.timestamp));
          body.append("folder", s.folder);
          body.append("type", s.type);
          body.append("transformation", s.transformation);
          body.append("signature", s.signature);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error?.message ?? "Upload failed");
          uploaded.push({ publicId: json.public_id, width: json.width, height: json.height });
        } catch (err) {
          failed++;
          console.error("gallery upload failed", file.name, err);
        }
        setProgress({ done: uploaded.length + failed, total: files.length, failed });
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    try {
      for (let i = 0; i < uploaded.length; i += 200) await addPhotos({ albumId, photos: uploaded.slice(i, i + 200) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving photos failed");
    }
    if (failed) setError(`${failed} photo${failed === 1 ? "" : "s"} failed to upload. Try those again.`);
    setProgress(null);
    router.refresh();
  }

  function reorder(next: Photo[]) {
    setPhotos(next);
    void reorderPhotos(albumId, next.map((p) => p.id));
  }

  const busy = progress !== null;

  return (
    <section className="space-y-4 rounded-md border p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Photos ({photos.length})</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder. The starred photo is the album cover.</p>
        </div>
        <Button asChild disabled={busy}>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {busy ? `Uploading ${progress.done}/${progress.total}` : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) void upload(files);
              }}
            />
          </label>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No photos yet. Add some above.</p>
      ) : (
        <Sortable value={photos} onValueChange={reorder} getItemValue={(p) => p.id} orientation="mixed">
          <SortableContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((p) => (
              <SortableItem key={p.id} value={p.id} className="overflow-hidden rounded-lg border bg-card">
                <div className="relative aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URL */}
                  <img src={p.thumbUrl} alt={p.caption ?? ""} loading="lazy" className={`h-full w-full object-cover ${p.hidden ? "opacity-40" : ""}`} />
                  <SortableItemHandle
                    render={
                      <Button type="button" size="icon" variant="secondary" className="absolute left-1.5 top-1.5 size-7 cursor-grab" aria-label="Drag to reorder" />
                    }
                  >
                    <GripVertical className="size-4" />
                  </SortableItemHandle>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-1.5 top-1.5 size-7"
                    aria-label={p.id === coverPhotoId ? "Album cover" : "Make album cover"}
                    onClick={async () => {
                      await setAlbumCover(albumId, p.id);
                      router.refresh();
                    }}
                  >
                    <Star className={`size-4 ${p.id === coverPhotoId ? "fill-amber-400 text-amber-400" : ""}`} />
                  </Button>
                  {p.hidden && (
                    <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                      <EyeOff className="size-3" /> Removal requested
                    </span>
                  )}
                  <ConfirmDelete
                    trigger={
                      <Button type="button" size="icon" variant="destructive" className="absolute bottom-1.5 right-1.5 size-7" aria-label="Delete photo">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Delete photo"
                    description="This deletes the photo for good."
                    onConfirm={async () => {
                      await deletePhoto(p.id);
                      router.refresh();
                    }}
                  />
                </div>
                <Input
                  defaultValue={p.caption ?? ""}
                  placeholder="Caption"
                  className="h-8 rounded-none border-0 border-t text-xs shadow-none"
                  onBlur={(e) => {
                    if (e.target.value !== (p.caption ?? "")) void updatePhotoCaption(p.id, e.target.value);
                  }}
                />
              </SortableItem>
            ))}
          </SortableContent>
        </Sortable>
      )}
    </section>
  );
}
