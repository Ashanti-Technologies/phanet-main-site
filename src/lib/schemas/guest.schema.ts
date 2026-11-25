import { z } from "zod";

export const HEARD_FROM = [
  "FRIEND_FAMILY",
  "SOCIAL_MEDIA",
  "YOUTUBE",
  "CHURCH",
  "CAMPUS",
  "EVENT",
  "SEARCH",
  "OTHER",
] as const;
export type HeardFromValue = (typeof HEARD_FROM)[number];

export const HEARD_FROM_LABELS: Record<HeardFromValue, string> = {
  FRIEND_FAMILY: "A friend or family member",
  SOCIAL_MEDIA: "Social media",
  YOUTUBE: "YouTube",
  CHURCH: "My church",
  CAMPUS: "On campus",
  EVENT: "A PHANET event",
  SEARCH: "Searching online",
  OTHER: "Somewhere else",
};

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const planFirstVisitSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your name").max(120),
    phone: optionalText(30),
    email: z.union([z.email("Enter a valid email").trim().toLowerCase(), z.literal("")]).optional(),
    location: z
      .object({
        countryId: z.string().nullable(),
        country: z.string().max(100),
        regionId: z.string().nullable(),
        region: z.string().max(100),
        cityId: z.string().nullable(),
        city: z.string().max(100),
      })
      .optional(),
    /** A CHAPTER unit, or empty for "not sure" (national team). */
    unitId: optionalText(40),
    heardFrom: z.enum(HEARD_FROM, "Tell us how you heard about us"),
    heardFromOther: optionalText(120),
    /** One of the upcoming Elim Hours offered on the form (checked on the server). */
    plannedFor: z.iso.datetime(),
    prayerRequest: optionalText(2000),
    /** Honeypot: people never see it, bots fill it. */
    website: z.string().optional(),
  })
  .refine((d) => (d.phone?.replace(/\D/g, "").length ?? 0) >= 9 || !!d.email, {
    message: "Give us a phone number or an email so we can remind you",
    path: ["phone"],
  });

export type PlanFirstVisitInput = z.input<typeof planFirstVisitSchema>;

export const assignGuestSchema = z.object({
  guestId: z.cuid(),
  /** Defaults to the signed-in admin. */
  assignedToId: z.string().min(1).optional(),
});

export const routeGuestSchema = z.object({
  guestId: z.cuid(),
  /** A CHAPTER unit, or null to hand the guest back to the national team. */
  unitId: z.string().min(1).nullable(),
});
