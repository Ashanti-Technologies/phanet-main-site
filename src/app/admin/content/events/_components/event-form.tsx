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
import { DateRangeField } from "@/app/components/date-field";
import { RichTextEditor } from "@/app/admin/_components/rich-text-editor";
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { DeleteButton } from "@/app/admin/_components/delete-button";
import {
  DEFAULT_REGISTRATION_FIELDS,
  eventRegistrationFieldsSchema,
  parseRegistrationFields,
  type RegistrationField,
} from "@/lib/schemas/event-registration.schema";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/app/components/animate-ui/components/animate/tabs";
import { RegistrationFormBuilder } from "./registration-form-builder";
import { FeesEditor, newTierDraft, type PaymentMode, type TierDraft } from "./fees-editor";
import { eventPriceTierSchema, feeSettingsError } from "@/lib/schemas/cms.schema";

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
    headerImageUrl: string | null;
    headerImagePublicId: string | null;
    status: "DRAFT" | "PUBLISHED";
    type: "MEETING" | "CAMP";
    registrationEnabled: boolean;
    allowOnline: boolean;
    registrationClosesAt: Date | string | null;
    registrationFields: unknown;
    paymentMode: PaymentMode;
    feeFundId: string | null;
    priceTiers: { id: string; name: string; description: string | null; amount: number }[];
    bookingCount: number;
  } | null;
  otherForms: { id: string; title: string; registrationFields: unknown }[];
  funds: { id: string; name: string }[];
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

/** Seeded by the event_fees migration. */
const DEFAULT_FEE_FUND_ID = "fund_events";

export function EventForm({ event: initialEvent, otherForms, funds }: EventFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [slug, setSlug] = useState(initialEvent?.slug ?? "");
  const [category, setCategory] = useState(initialEvent?.category ?? "national");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initialEvent?.status ?? "DRAFT"
  );
  const [date, setDate] = useState<string | null>(
    toDateInput(initialEvent?.date) || null
  );
  const [endDate, setEndDate] = useState<string | null>(
    toDateInput(initialEvent?.endDate) || null
  );
  const [isFeatured, setIsFeatured] = useState(!!initialEvent?.isFeatured);
  const [type, setType] = useState<"MEETING" | "CAMP">(
    initialEvent?.type ?? "MEETING"
  );
  const [registrationEnabled, setRegistrationEnabled] = useState(
    !!initialEvent?.registrationEnabled
  );
  const [allowOnline, setAllowOnline] = useState(!!initialEvent?.allowOnline);
  const [registrationFields, setRegistrationFields] = useState<
    RegistrationField[]
  >(() =>
    initialEvent?.registrationFields == null
      ? DEFAULT_REGISTRATION_FIELDS
      : parseRegistrationFields(initialEvent.registrationFields),
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialEvent?.paymentMode ?? "FREE");
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    initialEvent?.priceTiers.length ? initialEvent.priceTiers.map(newTierDraft) : [newTierDraft()],
  );
  const [feeFundId, setFeeFundId] = useState<string | null>(
    initialEvent?.feeFundId ??
      (funds.some((f) => f.id === DEFAULT_FEE_FUND_ID) ? DEFAULT_FEE_FUND_ID : null),
  );
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
  const [headerImage, setHeaderImage] = useState<{
    url?: string;
    publicId?: string;
  }>({
    url: initialEvent?.headerImageUrl ?? undefined,
    publicId: initialEvent?.headerImagePublicId ?? undefined,
  });

  async function handleSubmit(formData: FormData) {
    if (!date) {
      setError("Pick a date for the event");
      return;
    }
    // Blank questions are dropped; anything else must be valid before saving
    // (server-side Zod errors are hidden in production).
    const fields = registrationFields.filter((f) => f.label.trim());
    const checked = eventRegistrationFieldsSchema.safeParse(fields);
    if (!checked.success) {
      const issue = checked.error.issues[0];
      const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
      setTab("registration");
      setError(
        index >= 0
          ? `Registration form, “${fields[index].label}”: ${issue.message}`
          : `Registration form: ${issue.message}`,
      );
      return;
    }
    // Fees: blank rows are dropped; the rest must parse.
    const tierRows = paymentMode === "FREE" ? [] : tiers.filter((t) => t.name.trim() || t.amount.trim());
    const priceTiers = [];
    for (const t of tierRows) {
      const parsed = eventPriceTierSchema.safeParse({
        id: t.id,
        name: t.name,
        description: t.description,
        amount: t.amount.trim() === "" ? undefined : t.amount,
      });
      if (!parsed.success) {
        setTab("registration");
        setError(`Fees, “${t.name || "unnamed price"}”: ${parsed.error.issues[0].message}`);
        return;
      }
      priceTiers.push(parsed.data);
    }
    const feeError = feeSettingsError({ paymentMode, registrationEnabled, feeFundId, priceTiers });
    if (feeError) {
      setTab("registration");
      setError(`Fees: ${feeError}`);
      return;
    }
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
        date,
        endDate,
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
        headerImageUrl: headerImage.url,
        headerImagePublicId: headerImage.publicId,
        status,
        type,
        registrationEnabled,
        allowOnline,
        registrationClosesAt: formData.get("registrationClosesAt")
          ? new Date(String(formData.get("registrationClosesAt"))).toISOString()
          : null,
        registrationFields: checked.data,
        paymentMode,
        feeFundId,
        priceTiers,
      });
      if (!result.success) {
        setTab("registration");
        setError(result.error);
        return;
      }

      router.push(`/admin/content/events/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      // Required fields live on the details tab; jump there so the browser can focus them.
      onInvalidCapture={() => setTab("details")}
      className="space-y-6 lg:w-2/3"
    >
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="details">Event details</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
        </TabsList>

        <TabsContents className="mt-4">
          <TabsContent value="details" className="space-y-6 p-px">
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Dates *</Label>
                <DateRangeField
                  value={{ from: date, to: endDate }}
                  onChange={({ from, to }) => {
                    setDate(from);
                    setEndDate(to);
                  }}
                  placeholder="Pick a start date (and end date for multi-day events)"
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input name="time" defaultValue={initialEvent?.time ?? ""} placeholder="e.g. 6:00 PM" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as "DRAFT" | "PUBLISHED")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Event type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as "MEETING" | "CAMP")}
                >
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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

            <div className="space-y-2">
              <Label>Flyer</Label>
              <CloudinaryImageField
                value={image}
                onChange={setImage}
                ownerType="event"
                ownerId={initialEvent?.id}
              />
            </div>

            <div className="space-y-2">
              <Label>Header background (optional)</Label>
              <CloudinaryImageField
                value={headerImage}
                onChange={setHeaderImage}
                ownerType="event"
                ownerId={initialEvent?.id}
              />
              <p className="text-xs text-muted-foreground">
                Wide image shown behind the title on the event page. Falls back to the
                category colour.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-md border p-4">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="featured" />
              <Label htmlFor="featured">Feature this event on the events page</Label>
            </div>
          </TabsContent>

          <TabsContent value="registration" className="space-y-6 p-px">
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Switch id="allowOnline" checked={allowOnline} onCheckedChange={setAllowOnline} />
                      <Label htmlFor="allowOnline">People can also follow online</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each person picks In person or Online. Online is free and skips
                      questions marked &ldquo;Only ask in-person attendees&rdquo;.
                    </p>
                  </div>
                  <RegistrationFormBuilder
                    value={registrationFields}
                    onChange={setRegistrationFields}
                    otherForms={otherForms}
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

            <FeesEditor
              mode={paymentMode}
              onModeChange={setPaymentMode}
              tiers={tiers}
              onTiersChange={setTiers}
              fundId={feeFundId}
              onFundChange={setFeeFundId}
              funds={funds}
              registrationEnabled={registrationEnabled}
              unpricedBookings={
                initialEvent && (initialEvent.paymentMode === "FREE" || initialEvent.paymentMode === "DISPLAY_ONLY")
                  ? initialEvent.bookingCount
                  : 0
              }
            />
          </TabsContent>
        </TabsContents>
      </Tabs>

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex gap-2 *:flex-1 sm:*:flex-none">
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
