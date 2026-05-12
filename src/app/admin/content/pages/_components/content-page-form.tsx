"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { deleteContentPage, saveContentPage } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { RichTextEditor } from "@/app/admin/_components/rich-text-editor";
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { DeleteButton } from "@/app/admin/_components/delete-button";

type ContentPageFormProps = {
  page?: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    bodyHtml: string;
    bodyJson: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
    imageUrl: string | null;
    imagePublicId: string | null;
    imageAlt: string | null;
    status: "DRAFT" | "PUBLISHED";
  } | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ContentPageForm({ page }: ContentPageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    page?.status ?? "DRAFT"
  );
  const [body, setBody] = useState({
    html: page?.bodyHtml ?? "<p></p>",
    json: page?.bodyJson,
  });
  const [image, setImage] = useState<{
    url?: string;
    publicId?: string;
    alt?: string;
  }>({
    url: page?.imageUrl ?? undefined,
    publicId: page?.imagePublicId ?? undefined,
    alt: page?.imageAlt ?? undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveContentPage({
        id: page?.id,
        title,
        slug,
        summary: String(formData.get("summary") || ""),
        seoTitle: String(formData.get("seoTitle") || ""),
        seoDescription: String(formData.get("seoDescription") || ""),
        bodyHtml: body.html,
        bodyJson: body.json,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        imageAlt: image.alt,
        status,
      });
      router.push(`/admin/content/pages/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="max-w-4xl space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!page?.id) setSlug(slugify(event.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            required
            spellCheck={false}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as "DRAFT" | "PUBLISHED")}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Summary</Label>
        <Textarea name="summary" rows={3} defaultValue={page?.summary ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Body *</Label>
        <RichTextEditor value={body.html} onChange={setBody} />
      </div>
      <CloudinaryImageField
        value={image}
        onChange={setImage}
        ownerType="content_page"
        ownerId={page?.id}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>SEO title</Label>
          <Input name="seoTitle" defaultValue={page?.seoTitle ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>SEO description</Label>
          <Input
            name="seoDescription"
            defaultValue={page?.seoDescription ?? ""}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {page && (
            <DeleteButton
              title="Delete page"
              description="This removes the page from the CMS."
              onDelete={async () => {
                await deleteContentPage(page.id);
                router.push("/admin/content/pages");
                router.refresh();
              }}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/content/pages">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save page
          </Button>
        </div>
      </div>
    </form>
  );
}
