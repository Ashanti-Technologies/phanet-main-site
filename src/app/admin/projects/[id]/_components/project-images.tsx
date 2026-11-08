"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CldUploadWidgetProps } from "next-cloudinary";
import { addProjectImage, deleteProjectImage } from "@/actions/images";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Plus, Trash2, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";

const CldUploadWidget = dynamic<CldUploadWidgetProps>(
  () => import("next-cloudinary").then((mod) => mod.CldUploadWidget),
  { ssr: false },
);

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

interface ProjectImagesProps {
  project: {
    id: string;
    images: Array<{
      id: string;
      url: string;
      publicId: string;
      order: number;
    }>;
  };
}

export function ProjectImages({ project }: ProjectImagesProps) {
  const [images, setImages] = useState(project.images);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUploadSuccess(result: {
    info: { secure_url: string; public_id: string };
  }) {
    setIsUploading(true);
    try {
      const response = await addProjectImage({
        projectId: project.id,
        url: result.info.secure_url,
        publicId: result.info.public_id,
      });

      if (response.success && response.image) {
        setImages([...images, response.image]);
      }
    } catch (error) {
      console.error("Failed to save image:", error);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    try {
      await deleteProjectImage(imageId);
      setImages(images.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error("Failed to delete image:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Images</CardTitle>
        <CardDescription>Add images to showcase your project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={image.url}
                alt="Project image"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(image.id)}
                  disabled={deletingId === image.id}
                >
                  {deletingId === image.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          {CLOUDINARY_UPLOAD_PRESET ? (
            <CldUploadWidget
              uploadPreset={CLOUDINARY_UPLOAD_PRESET}
              signatureEndpoint="/api/sign-cloudinary-params"
              onSuccess={(result) =>
                handleUploadSuccess(
                  result as { info: { secure_url: string; public_id: string } },
                )
              }
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  disabled={isUploading}
                  className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Plus className="h-8 w-8" />
                      <span className="text-sm">Add Image</span>
                    </div>
                  )}
                </button>
              )}
            </CldUploadWidget>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-4 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm font-medium">Uploads unavailable</span>
                <span className="text-xs">
                  Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
                </span>
              </div>
            </div>
          )}
        </div>

        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No images yet. Click the button above to add images.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
