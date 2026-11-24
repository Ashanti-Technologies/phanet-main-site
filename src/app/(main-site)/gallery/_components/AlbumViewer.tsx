"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { InfiniteMasonry } from "@/app/components/motion/infinite-masonry";
import {
  ImageViewer,
  ImageViewerClose,
  ImageViewerContent,
  ImageViewerCounter,
  ImageViewerThumbnail,
  useImageViewer,
} from "@/app/components/motion/morphing-lightbox";
import { requestTakedown } from "@/actions/gallery";
import type { GalleryImage } from "@/lib/gallery";
import { takedownReasons } from "@/lib/schemas/gallery.schema";

type Props = { images: GalleryImage[]; signedIn: boolean; albumPath: string };

export function AlbumViewer({ images, signedIn, albumPath }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  function onTakedownDone() {
    setValue(null);
    setNotice("Thank you. That photo is hidden while our team reviews your request.");
    router.refresh();
  }

  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-500/30">
          {notice}
        </p>
      )}
      <ImageViewer images={images} value={value} onValueChange={setValue} label="Album photos">
        <InfiniteMasonry
          items={images}
          getItemKey={(p) => p.id}
          estimateSize={(p) => Math.round((240 * p.height) / p.width)}
          renderItem={(p) => <ImageViewerThumbnail imageId={p.id} className="w-full rounded-xl" />}
          onLoadMore={() => {}}
          hasMore={false}
          minColumnWidth={220}
          gap={10}
          ariaLabel="Album photos"
          className="h-[80dvh] rounded-2xl border-white/10 bg-white/[0.02] p-2"
          emptyState={<p className="py-16 text-center text-gray-400">No photos in this album yet.</p>}
        />
        <ImageViewerContent
          header={
            <>
              <ImageViewerCounter />
              <div className="flex items-center gap-2">
                <TakedownControl signedIn={signedIn} albumPath={albumPath} onDone={onTakedownDone} />
                <ImageViewerClose />
              </div>
            </>
          }
        />
      </ImageViewer>
    </>
  );
}

function TakedownControl({
  signedIn,
  albumPath,
  onDone,
}: {
  signedIn: boolean;
  albumPath: string;
  onDone: () => void;
}) {
  const { image } = useImageViewer();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<keyof typeof takedownReasons>("ME_IN_PHOTO");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trigger =
    "inline-flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  if (!signedIn) {
    return (
      <a href={`/auth/login?callbackUrl=${encodeURIComponent(albumPath)}`} className={trigger}>
        <Flag className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Request removal</span>
      </a>
    );
  }

  function submit() {
    if (!image) return;
    setError(null);
    startTransition(async () => {
      const res = await requestTakedown({ photoId: image.id, reason, note: note || undefined });
      if (!res.success) return setError(res.error ?? "Something went wrong.");
      setOpen(false);
      setNote("");
      onDone();
    });
  }

  return (
    <div className="relative">
      <button type="button" className={trigger} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Flag className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Request removal</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-10 w-72 rounded-2xl bg-gray-900 p-4 text-left text-sm text-white shadow-2xl ring-1 ring-white/15">
          <fieldset>
            <legend className="mb-2 font-medium">Why should this photo come down?</legend>
            {Object.entries(takedownReasons).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 py-1">
                <input
                  type="radio"
                  name="takedown-reason"
                  value={key}
                  checked={reason === key}
                  onChange={() => setReason(key as keyof typeof takedownReasons)}
                  className="accent-white"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything we should know? (optional)"
            className="mt-2 w-full rounded-lg bg-white/10 p-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          {error && <p className="mt-2 text-red-300">{error}</p>}
          <p className="mt-2 text-xs text-white/60">The photo is hidden straight away while our team reviews it.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-950 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Hide photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
