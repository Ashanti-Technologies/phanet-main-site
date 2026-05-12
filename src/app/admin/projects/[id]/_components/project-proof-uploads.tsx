"use client";

import { useState } from "react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createProofUpload, deleteProofUpload } from "@/actions/proof-uploads";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";

type ProofUpload = {
  id: string;
  imageUrl: string;
  publicId: string;
  note: string | null;
  createdAt: Date | string;
};

export function ProjectProofUploads({
  projectId,
  proofs,
}: {
  projectId: string;
  proofs: ProofUpload[];
}) {
  const [items, setItems] = useState(proofs);
  const [pendingUpload, setPendingUpload] = useState<{
    imageUrl: string;
    publicId: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    if (!pendingUpload) return;
    setIsSaving(true);
    const result = await createProofUpload({
      projectId,
      imageUrl: pendingUpload.imageUrl,
      publicId: pendingUpload.publicId,
      note: String(formData.get("note") || ""),
    });
    setItems([result.proof, ...items]);
    setPendingUpload(null);
    setIsSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteProofUpload(id);
    setItems(items.filter((item) => item.id !== id));
    setDeletingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={handleCreate} className="space-y-3 rounded-md border p-4">
          {pendingUpload ? (
            <div className="relative aspect-video max-w-md overflow-hidden rounded-md border">
              <Image
                src={pendingUpload.imageUrl}
                alt="Selected progress update"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              onSuccess={(result) => {
                const info = (result as {
                  info: { secure_url: string; public_id: string };
                }).info;
                setPendingUpload({
                  imageUrl: info.secure_url,
                  publicId: info.public_id,
                });
              }}
            >
              {({ open, isLoading }) => (
                <Button type="button" variant="outline" onClick={() => open()}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  Upload progress image
                </Button>
              )}
            </CldUploadWidget>
          )}
          <Textarea name="note" rows={3} placeholder="Progress note" />
          <Button type="submit" disabled={!pendingUpload || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish update
          </Button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((proof) => (
            <div key={proof.id} className="space-y-2 rounded-md border p-3">
              <div className="relative aspect-video overflow-hidden rounded-md">
                <Image
                  src={proof.imageUrl}
                  alt={proof.note || "Project progress update"}
                  fill
                  className="object-cover"
                />
              </div>
              {proof.note && <p className="text-sm">{proof.note}</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(proof.createdAt).toLocaleDateString()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(proof.id)}
                  disabled={deletingId === proof.id}
                  aria-label="Delete progress update"
                >
                  {deletingId === proof.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
