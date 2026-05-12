"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteHomepageSection, saveHomepageSection } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
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

type HomepageSection = {
  id: string;
  key: string;
  eyebrow: string | null;
  title: string;
  bodyHtml: string;
  bodyJson: unknown;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageAlt: string | null;
  order: number;
  status: "DRAFT" | "PUBLISHED";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function HomepageSectionForm({
  section,
}: {
  section?: HomepageSection;
}) {
  const router = useRouter();
  const [key, setKey] = useState(section?.key ?? "");
  const [title, setTitle] = useState(section?.title ?? "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    section?.status ?? "DRAFT"
  );
  const [body, setBody] = useState({
    html: section?.bodyHtml ?? "<p></p>",
    json: section?.bodyJson,
  });
  const [image, setImage] = useState<{
    url?: string;
    publicId?: string;
    alt?: string;
  }>({
    url: section?.imageUrl ?? undefined,
    publicId: section?.imagePublicId ?? undefined,
    alt: section?.imageAlt ?? undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await saveHomepageSection({
        id: section?.id,
        key,
        eyebrow: String(formData.get("eyebrow") || ""),
        title,
        bodyHtml: body.html,
        bodyJson: body.json,
        ctaLabel: String(formData.get("ctaLabel") || ""),
        ctaHref: String(formData.get("ctaHref") || ""),
        imageUrl: image.url,
        imagePublicId: image.publicId,
        imageAlt: image.alt,
        order: Number(formData.get("order") || 0),
        status,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section ? section.title : "New section"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Key *</Label>
              <Input
                value={key}
                onChange={(event) => setKey(slugify(event.target.value))}
                required
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                name="order"
                inputMode="numeric"
                defaultValue={section?.order ?? 0}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Eyebrow</Label>
              <Input name="eyebrow" defaultValue={section?.eyebrow ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>CTA label</Label>
              <Input name="ctaLabel" defaultValue={section?.ctaLabel ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>CTA link</Label>
              <Input name="ctaHref" defaultValue={section?.ctaHref ?? ""} />
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
          <RichTextEditor value={body.html} onChange={setBody} />
          <CloudinaryImageField
            value={image}
            onChange={setImage}
            ownerType="homepage_section"
            ownerId={section?.id}
          />
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              {section && (
                <DeleteButton
                  title="Delete homepage section"
                  description="This removes the section from the homepage CMS."
                  onDelete={async () => {
                    await deleteHomepageSection(section.id);
                    router.refresh();
                  }}
                />
              )}
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save section
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
