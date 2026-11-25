"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteTestimonial, saveTestimonial } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { DeleteButton } from "@/app/admin/_components/delete-button";

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  order: number;
  status: "DRAFT" | "PUBLISHED";
};

export function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  const router = useRouter();
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    testimonial?.status ?? "DRAFT"
  );
  const [image, setImage] = useState<{ url?: string; publicId?: string; alt?: string }>({
    url: testimonial?.imageUrl ?? undefined,
    publicId: testimonial?.imagePublicId ?? undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await saveTestimonial({
        id: testimonial?.id,
        name: String(formData.get("name") || ""),
        role: String(formData.get("role") || ""),
        quote: String(formData.get("quote") || ""),
        imageUrl: image.url,
        imagePublicId: image.publicId,
        order: Number(formData.get("order") || 0),
        status,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save testimonial");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{testimonial ? testimonial.name : "New testimonial"}</CardTitle>
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
              <Label htmlFor={`name-${testimonial?.id ?? "new"}`}>Name *</Label>
              <Input
                id={`name-${testimonial?.id ?? "new"}`}
                name="name"
                defaultValue={testimonial?.name ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`role-${testimonial?.id ?? "new"}`}>Role / chapter</Label>
              <Input
                id={`role-${testimonial?.id ?? "new"}`}
                name="role"
                placeholder="Campus Coordinator, UCC Chapter"
                defaultValue={testimonial?.role ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`order-${testimonial?.id ?? "new"}`}>Order</Label>
              <Input
                id={`order-${testimonial?.id ?? "new"}`}
                name="order"
                inputMode="numeric"
                defaultValue={testimonial?.order ?? 0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`quote-${testimonial?.id ?? "new"}`}>Their words *</Label>
            <Textarea
              id={`quote-${testimonial?.id ?? "new"}`}
              name="quote"
              rows={4}
              maxLength={600}
              defaultValue={testimonial?.quote ?? ""}
              required
            />
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
          <CloudinaryImageField
            value={image}
            onChange={setImage}
            ownerType="testimonial"
            ownerId={testimonial?.id}
          />
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              {testimonial && (
                <DeleteButton
                  title="Delete testimonial"
                  description="This removes the story from the website."
                  onDelete={async () => {
                    await deleteTestimonial(testimonial.id);
                    router.refresh();
                  }}
                />
              )}
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save testimonial
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
