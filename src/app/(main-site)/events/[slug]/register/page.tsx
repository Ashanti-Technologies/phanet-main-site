import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, ImagePlus, MapPin, Users, XCircle } from "lucide-react";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { isRegistrationOpen } from "@/lib/event-registration";
import { HOE, registerEmailUrl, registerLocation } from "@/lib/event-subdomain";
import { fillShareMessage, whatsappShareUrl } from "@/lib/share-message";
import { Button } from "@/app/components/ui/button";
import { formatEventDate } from "@/lib/events";
import { AccountGate } from "./_components/account-gate";
import { RegistrationForm } from "@/app/components/event-registration/registration-form";
import { loadRegistrationForm } from "@/app/components/event-registration/load-form";
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
  sessionUser: { id: string; name: string; email: string };
  registerPath: string;
}) {
  // Links a login to its member record by verified email on first visit.
  await getCurrentMemberForPortal();
  const { registration, formProps } = await loadRegistrationForm(event, sessionUser);
  const { key, ...form } = formProps;

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

  return (
    <>
      {paymentCard}
      {form.draft && (
        <p className="rounded-2xl border bg-muted p-4 text-sm">
          Welcome back — we kept what you filled in last time.
        </p>
      )}
      <RegistrationForm key={key} {...form} open={open} registerPath={registerPath} />
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
  // Times are Ghana time (= GMT); say so for people joining from abroad.
  const time = event.time && !/GMT|UTC/i.test(event.time) ? `${event.time} GMT` : event.time;
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
    time,
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
          {event.slug === HOE.slug && (
            <Button asChild variant="outline" size="lg" className="h-12 w-full">
              <Link href={`/events/${event.slug}/flyer${member ? `?name=${encodeURIComponent(member.preferredName || member.fullName)}` : ""}`}>
                <ImagePlus className="h-4 w-4" aria-hidden />
                Make your &ldquo;I&apos;m repping&rdquo; flyer
              </Link>
            </Button>
          )}
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
        {time && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {time}
          </p>
        )}
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

function Closed() {
  return (
    <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground sm:p-6">
      Registration for this event is closed. Please contact the organisers if
      you need help.
    </div>
  );
}
