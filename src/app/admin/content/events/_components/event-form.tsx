"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { saveEvent, deleteEvent } from "@/actions/cms";
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
import { Switch } from "@/app/components/ui/switch";
import { RichTextEditor } from "@/app/admin/_components/rich-text-editor";
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { DeleteButton } from "@/app/admin/_components/delete-button";
import {
  parseRegistrationFields,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";
import { RegistrationQuestionsEditor } from "./registration-questions-editor";

type EventFormProps = {
  event?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    date: Date | string;
    endDate: Date | string | null;
    time: string;
    location: string;
    address: string | null;
    description: string;
    bodyHtml: string;
    bodyJson: unknown;
    isFeatured: boolean;
    registrationUrl: string | null;
    imageUrl: string | null;
    imagePublicId: string | null;
    imageAlt: string | null;
    status: "DRAFT" | "PUBLISHED";
    type: "MEETING" | "CAMP";
    registrationEnabled: boolean;
    registrationClosesAt: Date | string | null;
    registrationFields: unknown;
  } | null;
};

function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

// datetime-local wants local wall-clock time, not UTC.
function toDateTimeInput(value?: Date | string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EventForm({ event: initialEvent }: EventFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [slug, setSlug] = useState(initialEvent?.slug ?? "");
  const [category, setCategory] = useState(initialEvent?.category ?? "national");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initialEvent?.status ?? "DRAFT"
  );
  const [isFeatured, setIsFeatured] = useState(!!initialEvent?.isFeatured);
  const [type, setType] = useState<"MEETING" | "CAMP">(
    initialEvent?.type ?? "MEETING"
  );
  const [registrationEnabled, setRegistrationEnabled] = useState(
    !!initialEvent?.registrationEnabled
  );
  const [registrationFields, setRegistrationFields] = useState<
    RegistrationField[]
  >(() => parseRegistrationFields(initialEvent?.registrationFields));
  const [body, setBody] = useState({
    html: initialEvent?.bodyHtml ?? "<p></p>",
    json: initialEvent?.bodyJson,
  });
  const [image, setImage] = useState<{
    url?: string;
    publicId?: string;
    alt?: string;
  }>({
    url: initialEvent?.imageUrl ?? undefined,
    publicId: initialEvent?.imagePublicId ?? undefined,
    alt: initialEvent?.imageAlt ?? undefined,
  });

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveEvent({
        id: initialEvent?.id,
        title,
        slug,
        category: category as
          | "national"
          | "regional"
          | "university-chapter"
          | "diaspora",
        date: String(formData.get("date")),
        endDate: String(formData.get("endDate") || "") || null,
        time: String(formData.get("time")),
        location: String(formData.get("location")),
        address: String(formData.get("address") || ""),
        description: String(formData.get("description")),
        bodyHtml: body.html,
        bodyJson: body.json,
        isFeatured,
        registrationUrl: String(formData.get("registrationUrl") || ""),
        imageUrl: image.url,
        imagePublicId: image.publicId,
        imageAlt: image.alt,
        status,
        type,
        registrationEnabled,
        registrationClosesAt: formData.get("registrationClosesAt")
          ? new Date(String(formData.get("registrationClosesAt"))).toISOString()
          : null,
        registrationFields: registrationFields.filter((f) => f.label.trim()),
      });

      router.push(`/admin/content/events/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
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
              if (!initialEvent?.id) setSlug(slugify(event.target.value));
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input name="date" type="date" defaultValue={toDateInput(initialEvent?.date)} required />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input name="endDate" type="date" defaultValue={toDateInput(initialEvent?.endDate)} />
        </div>
        <div className="space-y-2">
          <Label>Time *</Label>
          <Input name="time" defaultValue={initialEvent?.time ?? ""} required />
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Event type</Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as "MEETING" | "CAMP")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEETING">Meeting</SelectItem>
              <SelectItem value="CAMP">Camp (with accommodation)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="university-chapter">University Chapter</SelectItem>
              <SelectItem value="diaspora">Diaspora</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Location *</Label>
          <Input name="location" defaultValue={initialEvent?.location ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input name="address" defaultValue={initialEvent?.address ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          name="description"
          defaultValue={initialEvent?.description ?? ""}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Body *</Label>
        <RichTextEditor value={body.html} onChange={setBody} />
      </div>

      <CloudinaryImageField
        value={image}
        onChange={setImage}
        ownerType="event"
        ownerId={initialEvent?.id}
      />

      <section className="space-y-4 rounded-md border p-4">
        <div className="flex items-center gap-3">
          <Switch
            id="registrationEnabled"
            checked={registrationEnabled}
            onCheckedChange={setRegistrationEnabled}
          />
          <Label htmlFor="registrationEnabled">
            Members register on this website
          </Label>
        </div>

        {registrationEnabled ? (
          <>
            <div className="space-y-2 md:max-w-xs">
              <Label htmlFor="registrationClosesAt">Registration closes</Label>
              <Input
                id="registrationClosesAt"
                name="registrationClosesAt"
                type="datetime-local"
                defaultValue={toDateTimeInput(initialEvent?.registrationClosesAt)}
                suppressHydrationWarning
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep registration open until the event starts.
              </p>
            </div>
            <RegistrationQuestionsEditor
              value={registrationFields}
              onChange={setRegistrationFields}
            />
            {type === "CAMP" && (
              <p className="text-sm text-muted-foreground">
                After saving, set up rooms and allocate people from the
                event&apos;s Rooms tab.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label>External registration URL</Label>
            <Input
              name="registrationUrl"
              type="url"
              defaultValue={initialEvent?.registrationUrl ?? ""}
              placeholder="https://forms.google.com"
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-md border p-4">
        <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="featured" />
        <Label htmlFor="featured">Feature this event on the events page</Label>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {initialEvent && (
            <DeleteButton
              title="Delete event"
              description="This removes the event from the CMS and public website."
              onDelete={async () => {
                await deleteEvent(initialEvent.id);
                router.push("/admin/content/events");
                router.refresh();
              }}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/content/events">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save event
          </Button>
        </div>
      </div>
    </form>
  );
}
