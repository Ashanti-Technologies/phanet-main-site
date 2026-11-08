"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CldUploadWidgetProps } from "next-cloudinary";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { updateMyPhoto } from "@/actions/member-portal";
import { PROFILE_PICS_FOLDER } from "@/constants";

const CldUploadWidget = dynamic<CldUploadWidgetProps>(
  () => import("next-cloudinary").then((mod) => mod.CldUploadWidget),
  { ssr: false },
);

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberAvatarUploader({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(photoUrl);
  const [isPending, startTransition] = useTransition();

  function persist(next: { url: string | null; publicId: string | null }) {
    startTransition(async () => {
      await updateMyPhoto({
        photoUrl: next.url,
        photoPublicId: next.publicId,
      });
      setCurrent(next.url);
      router.refresh();
    });
  }

  function handleUpload(result: {
    info: { secure_url: string; public_id: string };
  }) {
    persist({ url: result.info.secure_url, publicId: result.info.public_id });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <Avatar className="h-16 w-16 ring-2 ring-mikado-yellow/40">
        {current ? <AvatarImage src={current} alt={name} /> : null}
        <AvatarFallback className="bg-midnight-green text-base font-semibold text-white">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">
          A friendly face helps your group lead recognise you.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CLOUDINARY_UPLOAD_PRESET ? (
          <CldUploadWidget
            uploadPreset={CLOUDINARY_UPLOAD_PRESET}
            signatureEndpoint="/api/sign-cloudinary-params"
            options={{
              sources: ["local", "camera"],
              maxFiles: 1,
              folder: PROFILE_PICS_FOLDER,
            }}
            onSuccess={(result) =>
              handleUpload(
                result as { info: { secure_url: string; public_id: string } },
              )
            }
          >
            {({ open }) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => open()}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-1.5 h-4 w-4" />
                )}
                {current ? "Change photo" : "Upload photo"}
              </Button>
            )}
          </CldUploadWidget>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            <Camera className="mr-1.5 h-4 w-4" />
            Upload unavailable
          </Button>
        )}
        {current ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => persist({ url: null, publicId: null })}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
