"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { CldUploadWidgetProps } from "next-cloudinary";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { createMediaAsset } from "@/actions/cms";

const CldUploadWidget = dynamic<CldUploadWidgetProps>(
  () => import("next-cloudinary").then((mod) => mod.CldUploadWidget),
  { ssr: false },
);

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

type ImageValue = {
  url?: string;
  publicId?: string;
  alt?: string;
};

type CloudinaryImageFieldProps = {
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  ownerType?: string;
  ownerId?: string;
  folder?: string;
};

export function CloudinaryImageField({
  value,
  onChange,
  ownerType,
  ownerId,
  folder,
}: CloudinaryImageFieldProps) {
  async function handleUpload(result: {
    info: { secure_url: string; public_id: string };
  }) {
    const nextValue = {
      ...value,
      url: result.info.secure_url,
      publicId: result.info.public_id,
    };
    onChange(nextValue);

    if (nextValue.alt) {
      await createMediaAsset({
        url: nextValue.url,
        publicId: nextValue.publicId,
        altText: nextValue.alt,
        ownerType,
        ownerId,
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* <div className="space-y-2">
        <Label htmlFor="imageAlt">Image alt text</Label>
        <Input
          id="imageAlt"
          value={value.alt ?? ""}
          onChange={(event) => onChange({ ...value, alt: event.target.value })}
          placeholder="Describe this image"
        />
      </div> */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {value.url ? (
          <div className="relative h-32 w-full overflow-hidden rounded-md border bg-muted sm:w-56">
            <Image
              src={value.url}
              alt={value.alt || "Selected image"}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed bg-muted/40 text-sm text-muted-foreground sm:w-56">
            No image selected
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {CLOUDINARY_UPLOAD_PRESET ? (
            <CldUploadWidget
              uploadPreset={CLOUDINARY_UPLOAD_PRESET}
              signatureEndpoint="/api/sign-cloudinary-params"
              options={folder ? { folder } : undefined}
              onSuccess={(result) =>
                handleUpload(
                  result as { info: { secure_url: string; public_id: string } },
                )
              }
            >
              {({ open, isLoading }) => (
                <Button type="button" variant="outline" onClick={() => open()}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
              )}
            </CldUploadWidget>
          ) : (
            <div className="flex flex-col gap-1">
              <Button type="button" variant="outline" disabled>
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload unavailable
              </Button>
              <p className="max-w-xs text-xs text-muted-foreground">
                Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to enable uploads.
              </p>
            </div>
          )}
          {value.url && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange({ alt: value.alt })}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
