import { prisma } from "@/lib/database";
import { getKnownPeople } from "@/lib/event-registration";
import { chargesFees } from "@/lib/event-fees";
import { parseRegistrationFields, type Answers } from "@/lib/schemas/event-registration.schema";
import type { LocationValue } from "@/app/components/location-input";
import type { ComponentProps } from "react";
import type { DraftData, FormRow, RegistrationForm } from "./registration-form";

type FormEvent = NonNullable<
  Awaited<ReturnType<typeof prisma.event.findFirst<{ include: { priceTiers: true } }>>>
>;

/**
 * Everything the registration form needs for one person (their booking or
 * saved draft, household, profile locations, earlier answers). Shared by the
 * public register page and the admin "register on their behalf" page.
 */
export async function loadRegistrationForm(
  event: FormEvent,
  user: { id: string; name: string; email: string },
) {
  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      householdId: true,
      city: true,
      region: true,
      country: true,
      countryRef: { select: { name: true } },
      regionRef: { select: { name: true } },
    },
  });

  const registration = member
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId: event.id, registrantId: member.id } },
        include: {
          attendees: {
            orderBy: { createdAt: "asc" },
            include: {
              member: { select: { id: true, fullName: true } },
              country: { select: { name: true } },
              region: { select: { name: true } },
            },
          },
        },
      })
    : null;

  const draftRow = registration
    ? null
    : await prisma.eventRegistrationDraft.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
        select: { data: true },
      });
  // Only restore drafts the form wrote (not the empty one from the sign-in step).
  const draftData = draftRow?.data as Partial<DraftData> | null | undefined;
  const draft = draftData && Array.isArray(draftData.rows) ? (draftData as DraftData) : null;

  const charges = chargesFees(event.paymentMode) && event.priceTiers.length > 0;
  const household = member ? await getKnownPeople(member) : [];
  const fields = parseRegistrationFields(event.registrationFields);

  // Pre-fill person questions (food, allergies, …) from each person's most
  // recent booking at another event. Matches by field id, so it works for
  // the default fields and for forms copied between events.
  const personFieldIds = new Set(fields.filter((f) => f.scope === "person").map((f) => f.id));
  const ids = [member?.id, ...household.map((h) => h.id)].filter((id): id is string => !!id);
  const profiles = ids.length
    ? await prisma.member.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          countryId: true,
          regionId: true,
          cityId: true,
          city: true,
          countryRef: { select: { name: true } },
          regionRef: { select: { name: true } },
        },
      })
    : [];
  const locations: Record<string, LocationValue> = Object.fromEntries(
    profiles
      .filter((p) => p.countryId)
      .map((p) => [p.id, toLocation({ ...p, country: p.countryRef, region: p.regionRef })]),
  );

  const previous =
    ids.length && personFieldIds.size
      ? await prisma.eventAttendee.findMany({
          where: { memberId: { in: ids }, eventId: { not: event.id } },
          orderBy: { createdAt: "desc" },
          distinct: ["memberId"],
          select: { memberId: true, answers: true },
        })
      : [];

  const existingRows: FormRow[] | null = registration
    ? registration.attendees.map((a) => ({
        key: a.id,
        kind: a.memberId === member?.id ? "self" : "known",
        memberId: a.memberId,
        label: a.member.fullName,
        relationship: a.relationship,
        ageGroup: a.ageGroup ?? undefined,
        priceTierId: a.priceTierId ?? undefined,
        attendance: a.attendance,
        location: a.countryId ? toLocation(a) : (locations[a.memberId] ?? toLocation(a)),
        booked: { priceTierId: a.priceTierId, amount: a.amount?.toNumber() ?? null },
        answers: (a.answers as Answers) ?? {},
      }))
    : null;

  const formProps = {
    // remount after save so new people become saved rows (no double-create)
    key: registration?.updatedAt.toISOString() ?? "new",
    event: {
      id: event.id,
      slug: event.slug,
      type: event.type,
      fields,
      allowOnline: event.allowOnline,
      paymentMode: event.paymentMode,
      tiers: charges
        ? event.priceTiers.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            amount: t.amount.toNumber(),
          }))
        : [],
      amountPaid: registration?.amountPaid.toNumber() ?? 0,
    },
    me: member
      ? {
          id: member.id,
          fullName: member.fullName,
          email: member.email ?? user.email,
          phone: member.phone,
          // [city, region, country] to pre-fill location questions.
          location: member.city
            ? [member.city, member.regionRef?.name ?? member.region ?? "", member.countryRef?.name ?? member.country ?? ""]
            : null,
        }
      : null,
    sessionUser: { id: user.id, name: user.name, email: user.email },
    household,
    locations,
    previous: Object.fromEntries(
      previous.map((p) => [
        p.memberId,
        Object.fromEntries(
          Object.entries((p.answers ?? {}) as Answers).filter(([id]) => personFieldIds.has(id)),
        ),
      ]),
    ),
    existing:
      registration && existingRows
        ? { rows: existingRows, answers: (registration.answers as Answers) ?? {} }
        : null,
    draft,
  } satisfies Omit<ComponentProps<typeof RegistrationForm>, "open" | "registerPath" | "admin"> & { key: string };

  return { registration, formProps };
}

function toLocation(p: {
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
  city: string | null;
  country: { name: string } | null;
  region: { name: string } | null;
}): LocationValue {
  return {
    countryId: p.countryId,
    country: p.country?.name ?? "",
    regionId: p.regionId,
    region: p.region?.name ?? "",
    cityId: p.cityId,
    city: p.city ?? "",
  };
}
