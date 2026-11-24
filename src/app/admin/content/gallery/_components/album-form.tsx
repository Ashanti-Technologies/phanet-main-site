"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteAlbum, saveAlbum } from "@/actions/gallery";
import type { GalleryAlbum } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { DateField, toISODate } from "@/app/components/date-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { DeleteButton } from "@/app/admin/_components/delete-button";

type EventOption = { id: string; title: string; date: Date };
const NO_EVENT = "none";

export function AlbumForm({ album, events }: { album?: GalleryAlbum; events: EventOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(album?.title ?? "");
  const [date, setDate] = useState<string | null>(album ? toISODate(album.date) : null);
  const [eventId, setEventId] = useState(album?.eventId ?? NO_EVENT);
  const [visibility, setVisibility] = useState(album?.visibility ?? "PUBLIC");
  const [status, setStatus] = useState(album?.status ?? "DRAFT");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickEvent(id: string) {
    setEventId(id);
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    // Prefill from the event; admins can still edit.
    if (!title) setTitle(ev.title);
    if (!date) setDate(toISODate(new Date(ev.date)));
  }

  async function handleSubmit(formData: FormData) {
    if (!date) return setError("Pick a date");
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveAlbum({
        id: album?.id,
        title,
        description: String(formData.get("description") || ""),
        date,
        eventId: eventId === NO_EVENT ? null : eventId,
        visibility,
        status,
      });
      router.push(album ? "/admin/content/gallery" : `/admin/content/gallery/${res.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save album");
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 rounded-md border p-4 md:p-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Event (optional)</Label>
          <Select value={eventId} onValueChange={pickEvent}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EVENT}>Not linked to an event</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} ({new Date(e.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Linked albums show a “Photos” button on the event page.</p>
        </div>
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Date *</Label>
          <DateField value={date} onChange={setDate} fromYear={2000} toYear={new Date().getFullYear() + 1} defaultMonth={new Date()} />
        </div>
        <div className="space-y-2">
          <Label>Who can see it</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Everyone</SelectItem>
              <SelectItem value="MEMBERS">Signed-in members only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={album?.description ?? ""} rows={3} />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {album && (
            <DeleteButton
              title="Delete album"
              description="This deletes the album and all of its photos for good."
              onDelete={async () => {
                await deleteAlbum(album.id);
                router.push("/admin/content/gallery");
                router.refresh();
              }}
            />
          )}
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {album ? "Save album" : "Create album and add photos"}
        </Button>
      </div>
    </form>
  );
}
