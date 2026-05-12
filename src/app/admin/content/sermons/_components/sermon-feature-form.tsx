"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteSermonFeature, saveSermonFeature } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { DeleteButton } from "@/app/admin/_components/delete-button";

type SermonFeature = {
  id: string;
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  publishedAt: Date | string | null;
  isFeatured: boolean;
  order: number;
  status: "DRAFT" | "PUBLISHED";
};

function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function SermonFeatureForm({ sermon }: { sermon?: SermonFeature }) {
  const router = useRouter();
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    sermon?.status ?? "DRAFT"
  );
  const [isFeatured, setIsFeatured] = useState(!!sermon?.isFeatured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await saveSermonFeature({
        id: sermon?.id,
        videoId: String(formData.get("videoId")),
        title: String(formData.get("title")),
        description: String(formData.get("description") || ""),
        thumbnailUrl: String(formData.get("thumbnailUrl") || ""),
        videoUrl: String(formData.get("videoUrl")),
        publishedAt: String(formData.get("publishedAt") || "") || null,
        order: Number(formData.get("order") || 0),
        isFeatured,
        status,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sermon");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-md border p-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Video ID *</Label>
          <Input name="videoId" defaultValue={sermon?.videoId ?? ""} required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Title *</Label>
          <Input name="title" defaultValue={sermon?.title ?? ""} required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Video URL *</Label>
          <Input name="videoUrl" type="url" defaultValue={sermon?.videoUrl ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label>Thumbnail URL</Label>
          <Input name="thumbnailUrl" type="url" defaultValue={sermon?.thumbnailUrl ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={sermon?.description ?? ""} rows={2} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Published date</Label>
          <Input name="publishedAt" type="date" defaultValue={toDateInput(sermon?.publishedAt)} />
        </div>
        <div className="space-y-2">
          <Label>Order</Label>
          <Input name="order" inputMode="numeric" defaultValue={sermon?.order ?? 0} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as "DRAFT" | "PUBLISHED")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border p-3">
        <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id={`featured-${sermon?.id ?? "new"}`} />
        <Label htmlFor={`featured-${sermon?.id ?? "new"}`}>Feature this message</Label>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {sermon && (
            <DeleteButton
              title="Delete sermon feature"
              description="This removes the curated message from the CMS."
              onDelete={async () => {
                await deleteSermonFeature(sermon.id);
                router.refresh();
              }}
            />
          )}
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save message
        </Button>
      </div>
    </form>
  );
}
