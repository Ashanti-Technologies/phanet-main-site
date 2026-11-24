"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { deletePublication, savePublication, signLibraryUpload } from "@/actions/library";
import type { Publication } from "@/app/generated/prisma/client";
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
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";

type Access = Publication["access"];
type Kind = Publication["kind"];
type Status = Publication["status"];

const ACCESS_HELP: Record<Access, string> = {
  FREE: "Anyone can read every page online.",
  AMAZON: "Sold on Amazon. No PDF here: cover, blurb and a link to the store.",
  PAID: "Visitors read the preview pages. Online sales come with Paystack (phase 2).",
};

export function PublicationForm({
  publication,
  authors,
}: {
  publication?: Publication;
  authors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState(publication?.authorId ?? authors[0]?.id ?? "");
  const [kind, setKind] = useState<Kind>(publication?.kind ?? "BOOK");
  const [access, setAccess] = useState<Access>(publication?.access ?? "FREE");
  const [status, setStatus] = useState<Status>(publication?.status ?? "DRAFT");
  const [downloadable, setDownloadable] = useState(publication?.downloadable ?? true);
  const [pdf, setPdf] = useState({
    publicId: publication?.pdfPublicId ?? "",
    pageCount: publication?.pageCount ?? null as number | null,
    name: publication?.pdfPublicId ? "Current PDF" : "",
  });
  const [cover, setCover] = useState<{ url?: string }>({ url: publication?.coverUrl ?? undefined });
  const [backCover, setBackCover] = useState<{ url?: string }>({ url: publication?.backCoverUrl ?? undefined });
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPdf(file: File) {
    setUploading(true);
    setError(null);
    try {
      const s = await signLibraryUpload();
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", s.apiKey);
      body.append("timestamp", String(s.timestamp));
      body.append("folder", s.folder);
      body.append("type", s.type);
      body.append("signature", s.signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Upload failed");
      if (json.format !== "pdf") throw new Error("That file isn't a PDF.");
      setPdf({ publicId: json.public_id, pageCount: json.pages ?? 1, name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await savePublication({
        id: publication?.id,
        title: String(formData.get("title")),
        subtitle: String(formData.get("subtitle") || ""),
        description: String(formData.get("description") || ""),
        kind,
        year: formData.get("year") ? Number(formData.get("year")) : null,
        authorId,
        access,
        pdfPublicId: pdf.publicId,
        pageCount: pdf.pageCount,
        previewPages: Number(formData.get("previewPages") || 10),
        downloadable,
        coverUrl: cover.url ?? "",
        backCoverUrl: backCover.url ?? "",
        spineColor: String(formData.get("spineColor")),
        buyUrl: String(formData.get("buyUrl") || ""),
        status,
        order: Number(formData.get("order") || 0),
      });
      router.push("/admin/content/library");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save book");
      setIsSaving(false);
    }
  }

  const hasPdf = access !== "AMAZON";

  return (
    <form action={handleSubmit} className="space-y-6 rounded-md border p-4 md:p-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input name="title" defaultValue={publication?.title ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input name="subtitle" defaultValue={publication?.subtitle ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Author *</Label>
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger><SelectValue placeholder="Pick an author" /></SelectTrigger>
            <SelectContent>
              {authors.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BOOK">Book</SelectItem>
              <SelectItem value="DEVOTIONAL">Devotional</SelectItem>
              <SelectItem value="BOOKLET">Booklet</SelectItem>
              <SelectItem value="MAGAZINE">Magazine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Year published</Label>
          <Input name="year" inputMode="numeric" defaultValue={publication?.year ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={publication?.description ?? ""} rows={4} placeholder="The blurb readers see." />
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-2 md:max-w-xs">
          <Label>Access</Label>
          <Select value={access} onValueChange={(v) => setAccess(v as Access)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="AMAZON">Sold on Amazon</SelectItem>
              <SelectItem value="PAID">Paid (preview only for now)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{ACCESS_HELP[access]}</p>
        </div>

        {hasPdf ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="pdf">PDF * <span className="font-normal text-muted-foreground">(10 MB max)</span></Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  disabled={uploading}
                  className="max-w-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPdf(file);
                  }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {pdf.publicId && !uploading && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {pdf.name} · {pdf.pageCount} pages
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {access === "PAID" && (
                <div className="space-y-2">
                  <Label>Preview pages</Label>
                  <Input name="previewPages" inputMode="numeric" defaultValue={publication?.previewPages ?? 10} />
                  <p className="text-xs text-muted-foreground">How many pages anyone can read before buying.</p>
                </div>
              )}
              <div className="flex items-center gap-3 self-end rounded-md border p-3">
                <Switch id="downloadable" checked={downloadable} onCheckedChange={setDownloadable} />
                <Label htmlFor="downloadable">
                  {access === "PAID" ? "Downloadable after purchase" : "Allow PDF download"}
                </Label>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Amazon link *</Label>
            <Input name="buyUrl" type="url" defaultValue={publication?.buyUrl ?? ""} placeholder="https://www.amazon.com/dp/…" />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Front cover {hasPdf ? <span className="font-normal text-muted-foreground">(optional, page 1 of the PDF otherwise)</span> : "*"}</Label>
          <CloudinaryImageField value={cover} onChange={setCover} folder="phanet/library/covers" />
        </div>
        <div className="space-y-2">
          <Label>Back cover</Label>
          <CloudinaryImageField value={backCover} onChange={setBackCover} folder="phanet/library/covers" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="spineColor">Spine colour</Label>
          <Input id="spineColor" name="spineColor" type="color" defaultValue={publication?.spineColor ?? "#7c2d12"} className="h-10 w-20 p-1" />
        </div>
        <div className="space-y-2">
          <Label>Order on shelf</Label>
          <Input name="order" inputMode="numeric" defaultValue={publication?.order ?? 0} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {publication && (
            <DeleteButton
              title="Delete book"
              description="This removes the book and its PDF from the library."
              onDelete={async () => {
                await deletePublication(publication.id);
                router.push("/admin/content/library");
                router.refresh();
              }}
            />
          )}
        </div>
        <Button type="submit" disabled={isSaving || uploading}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save book
        </Button>
      </div>
    </form>
  );
}
