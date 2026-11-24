"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteAuthor, saveAuthor } from "@/actions/library";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { DeleteButton } from "@/app/admin/_components/delete-button";
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";

type Author = {
  id: string;
  name: string;
  subtext: string | null;
  avatarUrl: string | null;
  order: number;
};

export function AuthorForm({ author, bookCount = 0 }: { author?: Author; bookCount?: number }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<{ url?: string }>({ url: author?.avatarUrl ?? undefined });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await saveAuthor({
        id: author?.id,
        name: String(formData.get("name")),
        subtext: String(formData.get("subtext") || ""),
        avatarUrl: avatar.url ?? "",
        order: Number(formData.get("order") || 0),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save author");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-md border p-4">
      {!author && <p className="text-sm font-medium">Add an author</p>}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[2fr_3fr_1fr]">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input name="name" defaultValue={author?.name ?? ""} placeholder="Rev. Dr. Kwame Mensah" required />
        </div>
        <div className="space-y-2">
          <Label>Subtext</Label>
          <Input name="subtext" defaultValue={author?.subtext ?? ""} placeholder="Founder, PHANET" maxLength={160} />
        </div>
        <div className="space-y-2">
          <Label>Order</Label>
          <Input name="order" inputMode="numeric" defaultValue={author?.order ?? 0} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Avatar</Label>
        <CloudinaryImageField value={avatar} onChange={setAvatar} folder="phanet/library/authors" />
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {author && (
            <DeleteButton
              title="Delete author"
              description={
                bookCount > 0
                  ? `This author still has ${bookCount} book(s); move or delete them first.`
                  : "This removes the author from the library."
              }
              onDelete={async () => {
                try {
                  await deleteAuthor(author.id);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to delete author");
                }
              }}
            />
          )}
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {author ? "Save author" : "Add author"}
        </Button>
      </div>
    </form>
  );
}
