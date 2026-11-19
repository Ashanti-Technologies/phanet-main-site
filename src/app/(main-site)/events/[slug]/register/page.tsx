import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarPlus, MapPin, Users, XCircle } from "lucide-react";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { getKnownPeople, isRegistrationOpen } from "@/lib/event-registration";
import { registerEmailUrl, registerLocation } from "@/lib/event-subdomain";
import { fillShareMessage, whatsappShareUrl } from "@/lib/share-message";
import { Button } from "@/app/components/ui/button";
import { formatEventDate } from "@/lib/events";
import {
  parseRegistrationFields,
  type Answers,
} from "@/lib/schemas/event-registration.schema";
import { AccountGate } from "./_components/account-gate";
import { RegistrationForm, type FormRow } from "./_components/registration-form";
import type { LocationValue } from "@/app/components/location-input";
import { SuccessScreen } from "@/app/components/success-celebration";
import { CompletePaymentButton } from "./_components/complete-payment-button";
import { settlePaymentIntent } from "@/lib/payments/settle";
import { balanceMinor, chargesFees, pesewas } from "@/lib/event-fees";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true },
  });
  // Form page: keep it out of search so it doesn't compete with the event page.
  return event
    ? { title: `Register · ${event.title}`, robots: { index: false, follow: true } }
    : {};
}

export default async function EventRegisterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED", registrationEnabled: true },
    include: { priceTiers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) notFound();

  // Back from Paystack (?reference=…). The webhook usually settled it already;
  // settling again is a no-op and covers a slow or misconfigured webhook.
  const reference = typeof sp.reference === "string" ? sp.reference : typeof sp.trxref === "string" ? sp.trxref : null;
  const payment = reference ? await settlePaymentIntent(reference) : null;

  const open = isRegistrationOpen(event);
  const session = await getServerAuthSession();
  const here = registerLocation(event.slug, (await headers()).get("host"));

  // A finished booking gets its own screen, not a banner above the form.
  if (session && (sp.done || payment?.status === "completed" || payment?.status === "pending")) {
    return (
      <main className="bg-background pt-20 text-foreground sm:pt-28">
        <div className="mx-auto w-full max-w-2xl px-4">
          <RegistrationDone
            event={event}
            paymentStatus={payment?.status === "pending" ? "pending" : payment ? "completed" : null}
            registerPath={here.path}
            email={session.user.email}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background pt-24 pb-16 text-foreground sm:pt-32">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4">
        <header className="space-y-4">
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Event details
          </Link>
          <div className="flex items-start gap-4">
            {event.imageUrl && (
              <Image
                src={event.imageUrl}
                alt=""
                width={160}
                height={200}
                className="h-24 w-20 shrink-0 rounded-lg border object-cover sm:h-28 sm:w-24"
              />
            )}
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Registration
              </p>
              <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {event.title}
              </h1>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {formatEventDate(
                    event.date.toISOString().slice(0, 10),
                    event.endDate?.toISOString().slice(0, 10),
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        {payment?.status === "failed" && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>The payment didn&apos;t go through and no money was taken. You can try again below.</p>
          </div>
        )}
        {sp.payment === "unavailable" && (
          <div className="rounded-2xl border bg-muted p-4 text-sm">
            Your booking is saved, but online payment couldn&apos;t start just now. Please try again below in a
            little while.
          </div>
        )}
        {sp.cancelled && (
          <div className="rounded-2xl border bg-muted p-4 text-sm">
            Your registration has been cancelled.
          </div>
        )}

        {!session ? (
          open ? (
            <AccountGate slug={event.slug} callbackUrl={here.url} />
          ) : (
            <Closed />
          )
        ) : (
          <SignedIn
            event={event}
            open={open}
            sessionUser={session.user}
            registerPath={here.path}
          />
        )}
      </div>
    </main>
  );
}

async function SignedIn({
  event,
  open,
  sessionUser,
  registerPath,
}: {
  event: NonNullable<
    Awaited<ReturnType<typeof prisma.event.findFirst<{ include: { priceTiers: true } }>>>
  >;
  open: boolean;
  sessionUser: { name: string; email: string };
  registerPath: string;
}) {
  const { member } = await getCurrentMemberForPortal();

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

  if (!open && !registration) return <Closed />;

  const charges = chargesFees(event.paymentMode) && event.priceTiers.length > 0;
  const balance = registration ? balanceMinor(registration.amountDue, registration.amountPaid) / 100 : 0;
  const paymentCard =
    registration && charges && pesewas(registration.amountDue) > 0 ? (
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-0.5">
          <p className="font-semibold">
            {balance === 0
              ? `Paid ${formatMoney(registration.amountPaid)}`
              : registration.status === "PENDING_PAYMENT"
                ? `Awaiting payment · ${formatMoney(balance)}`
                : `${formatMoney(balance)} ${event.paymentMode === "PAY_AT_EVENT" ? "to pay at the event" : "still to pay"}`}
          </p>
          <p className="text-muted-foreground">
            {balance === 0
              ? "Thank you — your booking is fully paid."
              : registration.status === "PENDING_PAYMENT"
                ? "Your places are held until payment is complete."
                : event.paymentMode === "PAY_AT_EVENT"
                  ? "Pay at the registration desk when you arrive."
                  : "Pay the balance for the people you added."}
          </p>
        </div>
        {balance > 0 && event.paymentMode === "ONLINE" && (
          <CompletePaymentButton
            eventId={event.id}
            label={registration.status === "PENDING_PAYMENT" ? "Complete payment" : "Pay now"}
          />
        )}
      </div>
    ) : null;

  const household = member ? await getKnownPeople(member) : [];

  const fields = parseRegistrationFields(event.registrationFields);

  // Pre-fill person questions (food, allergies, …) from each person's most
  // recent booking at another event. Matches by field id, so it works for
  // the default fields and for forms copied between events.
  const personFieldIds = new Set(
    fields.filter((f) => f.scope === "person").map((f) => f.id),
  );
  const ids = [member?.id, ...household.map((h) => h.id)].filter(
    (id): id is string => !!id,
  );
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
      .map((p) => [
        p.id,
        toLocation({ ...p, country: p.countryRef, region: p.regionRef }),
      ]),
  );

  const previous = ids.length && personFieldIds.size
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

  return (
    <>
    {paymentCard}
    <RegistrationForm
      // remount after save so new people become saved rows (no double-create)
      key={registration?.updatedAt.toISOString() ?? "new"}
      registerPath={registerPath}
      event={{
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
      }}
      open={open}
      me={
        member
          ? {
              id: member.id,
              fullName: member.fullName,
              email: member.email ?? sessionUser.email,
              phone: member.phone,
              // [city, region, country] to pre-fill location questions.
              location: member.city
                ? [
                    member.city,
                    member.regionRef?.name ?? member.region ?? "",
                    member.countryRef?.name ?? member.country ?? "",
                  ]
                : null,
            }
          : null
      }
      sessionUser={{ name: sessionUser.name, email: sessionUser.email }}
      household={household}
      locations={locations}
      previous={Object.fromEntries(
        previous.map((p) => [
          p.memberId,
          Object.fromEntries(
            Object.entries((p.answers ?? {}) as Answers).filter(([id]) =>
              personFieldIds.has(id),
            ),
          ),
        ]),
      )}
      existing={
        registration && existingRows
          ? { rows: existingRows, answers: (registration.answers as Answers) ?? {} }
          : null
      }
    />
    </>
  );
}

type RegisterEvent = NonNullable<
  Awaited<ReturnType<typeof prisma.event.findFirst<{ include: { priceTiers: true } }>>>
>;

/** "You're registered" screen: what was booked, what's left to pay, and what to do next. */
async function RegistrationDone({
  event,
  paymentStatus,
  registerPath,
  email,
}: {
  event: RegisterEvent;
  paymentStatus: "completed" | "pending" | null;
  registerPath: string;
  email: string;
}) {
  const { member } = await getCurrentMemberForPortal();
  const registration = member
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId: event.id, registrantId: member.id } },
        select: { amountDue: true, amountPaid: true, attendees: { select: { attendance: true } } },
      })
    : null;

  const date = formatEventDate(event.date.toISOString().slice(0, 10), event.endDate?.toISOString().slice(0, 10));
  const people = registration?.attendees.length ?? 0;
  const online = registration?.attendees.filter((a) => a.attendance === "ONLINE").length ?? 0;
  const charges = chargesFees(event.paymentMode) && event.priceTiers.length > 0;
  const balance = registration ? balanceMinor(registration.amountDue, registration.amountPaid) / 100 : 0;
  const pending = paymentStatus === "pending";
  const prices = charges ? event.priceTiers.map((t) => t.amount.toNumber()) : [];
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const shareText = fillShareMessage(event.shareMessage, {
    event: event.title,
    date,
    time: event.time,
    location: [event.location, event.address].filter(Boolean).join(", "),
    price:
      cheapest === 0 ? "Free" : prices.length === 1 ? formatMoney(cheapest) : `From ${formatMoney(cheapest)}`,
    online: event.allowOnline ? "You can also join online for free" : "",
    deadline:
      event.registrationClosesAt && event.registrationClosesAt > new Date()
        ? event.registrationClosesAt.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "Africa/Accra",
          })
        : "",
    link: registerEmailUrl(event.slug),
  });

  return (
    <SuccessScreen
      tone={pending ? "pending" : "success"}
      title={pending ? "Payment processing" : paymentStatus === "completed" ? "Payment received!" : "You're registered!"}
      actions={
        <>
          {!pending && balance > 0 && event.paymentMode === "ONLINE" && (
            <CompletePaymentButton className="h-12 w-full" eventId={event.id} label={`Pay ${formatMoney(balance)} now`} />
          )}
          <Button asChild size="lg" className="h-12 w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]">
            <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener noreferrer">
              <IconBrandWhatsapp className="h-5 w-5" aria-hidden />
              Invite friends on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 w-full">
            <a href={`/api/events/${event.id}/ics`} download>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Add to calendar
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 w-full">
            <Link href={registerPath}>View or change booking</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 w-full">
            <Link href="/me">Go to my portal</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-2 rounded-2xl border bg-card p-4 text-left text-foreground">
        <p className="font-semibold leading-snug">{event.title}</p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          {date}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {event.location}
        </p>
        {people > 0 && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            {people} {people === 1 ? "person" : "people"}
            {online > 0 && ` · ${online} online`}
            {charges && registration && (
              <>
                {" · "}
                {balance > 0
                  ? `${formatMoney(balance)} ${event.paymentMode === "PAY_AT_EVENT" ? "to pay at the event" : "still to pay"}`
                  : `${formatMoney(registration.amountPaid)} paid`}
              </>
            )}
          </p>
        )}
      </div>
      <p>
        {pending
          ? "Mobile Money can take a minute to confirm. We'll email you once it clears, so there's no need to pay again."
          : `We've emailed a confirmation to ${email}.`}
      </p>
    </SuccessScreen>
  );
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

function Closed() {
  return (
    <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground sm:p-6">
      Registration for this event is closed. Please contact the organisers if
      you need help.
    </div>
  );
}
