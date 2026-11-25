"use client";

import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { planFirstVisit } from "@/actions/guests";
import { buildIcsForEvent, ELIM_HOUR } from "@/lib/events";
import { HEARD_FROM, HEARD_FROM_LABELS, type HeardFromValue } from "@/lib/schemas/guest.schema";
import { EMPTY_LOCATION, LocationInput, type LocationValue } from "@/app/components/location-input";
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

/** Radix Select can't use "" as a value. */
const NOT_SURE = "not-sure";

function sundayLabel(iso: string, index: number) {
  const date = new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return index === 0 ? `This ${date}` : date;
}

function icsHref(iso: string) {
  const ics = buildIcsForEvent(ELIM_HOUR, new Date(iso));
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export default function PlanVisitForm({
  sundays,
  chapters,
}: {
  sundays: string[];
  chapters: { id: string; name: string }[];
}) {
  const [plannedFor, setPlannedFor] = useState(sundays[0] ?? "");
  const [unitId, setUnitId] = useState(NOT_SURE);
  const [heardFrom, setHeardFrom] = useState<HeardFromValue | "">("");
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ firstName: string; plannedFor: string } | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await planFirstVisit({
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      location: location.city || location.region || location.countryId ? location : undefined,
      unitId: unitId === NOT_SURE ? undefined : unitId,
      heardFrom: heardFrom as HeardFromValue,
      heardFromOther: String(formData.get("heardFromOther") ?? ""),
      plannedFor,
      prayerRequest: String(formData.get("prayerRequest") ?? ""),
      website: String(formData.get("website") ?? ""),
    }).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    posthog.capture("guest_form_submitted", { heard_from: heardFrom, picked_chapter: unitId !== NOT_SURE });
    setDone({ firstName: result.firstName, plannedFor: result.plannedFor });
  }

  if (done) {
    const index = Math.max(0, sundays.indexOf(done.plannedFor));
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" role="status">
        <CalendarCheck className="mx-auto h-10 w-10 text-crayola" aria-hidden />
        <h3 className="mt-4 text-2xl font-bold text-gray-900">
          You&apos;re all set, {done.firstName}!
        </h3>
        <p className="mt-3 text-gray-700">
          See you on {sundayLabel(done.plannedFor, index).replace(/^This /, "")} at 7:00 PM GMT.
          We&apos;ll send you a reminder that afternoon with the link.
        </p>
        <a
          href={icsHref(done.plannedFor)}
          download="elim-hour.ics"
          className="mt-6 inline-flex px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors"
        >
          Add to calendar
        </a>
      </div>
    );
  }

  return (
    <form action={submit} className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-sm space-y-5">
      {error && (
        <div role="alert" className="rounded-md border border-crayola/30 bg-crayola/10 p-3 text-sm text-crayola">
          {error}
        </div>
      )}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="pv-website">Website</label>
        <input id="pv-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pv-name">Your name</Label>
        <Input id="pv-name" name="fullName" autoComplete="name" required minLength={2} maxLength={120} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pv-phone">Phone / WhatsApp</Label>
          <Input id="pv-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pv-email">Email</Label>
          <Input id="pv-email" name="email" type="email" autoComplete="email" maxLength={200} />
        </div>
      </div>
      <p className="-mt-3 text-xs text-gray-500">Give us at least one, so we can send your reminder.</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pv-sunday">Which Sunday?</Label>
          <Select value={plannedFor} onValueChange={setPlannedFor}>
            <SelectTrigger id="pv-sunday" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sundays.map((iso, i) => (
                <SelectItem key={iso} value={iso}>
                  {sundayLabel(iso, i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pv-chapter">Nearest PHANET chapter</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger id="pv-chapter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOT_SURE}>Not sure</SelectItem>
              {chapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Where do you live? (optional)</span>
        <LocationInput id="pv-location" value={location} onChange={setLocation} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pv-heard">How did you hear about PHANET?</Label>
        <Select value={heardFrom} onValueChange={(v) => setHeardFrom(v as HeardFromValue)} required>
          <SelectTrigger id="pv-heard" className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {HEARD_FROM.map((value) => (
              <SelectItem key={value} value={value}>
                {HEARD_FROM_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {heardFrom === "OTHER" && (
          <Input name="heardFromOther" aria-label="Where did you hear about us?" placeholder="Where?" maxLength={120} />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pv-prayer">Anything we can pray with you about? (optional)</Label>
        <Textarea id="pv-prayer" name="prayerRequest" rows={3} maxLength={2000} />
        <p className="text-xs text-gray-500">This goes to our prayer team.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Plan my first Sunday
      </button>
      <p className="text-xs text-gray-500 text-center">
        We&apos;ll remind you that Sunday by text or email, and someone from our
        team may reach out to welcome you.
      </p>
    </form>
  );
}
