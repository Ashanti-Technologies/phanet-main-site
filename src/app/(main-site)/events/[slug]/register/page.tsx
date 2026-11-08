import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { isRegistrationOpen } from "@/lib/event-registration";
import { registerLocation } from "@/lib/event-subdomain";
import { formatEventDate } from "@/lib/events";
import { parseRegistrationFields } from "@/lib/schemas/event-registration.schema";
import { AccountGate } from "./_components/account-gate";
import { RegistrationForm, type FormRow } from "./_components/registration-form";

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
  return event ? { title: `Register · ${event.title} | PHANET` } : {};
}

export default async function EventRegisterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED", registrationEnabled: true },
  });
  if (!event) notFound();

  const open = isRegistrationOpen(event);
  const session = await getServerAuthSession();
  const here = registerLocation(event.slug, (await headers()).get("host"));

  return (
    <main className="bg-background py-16 my-16 text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Registration
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatEventDate(
                event.date.toISOString().slice(0, 10),
                event.endDate?.toISOString().slice(0, 10),
              )}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          </div>
          <Link
            href={`/events/${event.slug}`}
            className="inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            About this event
          </Link>
        </header>

        {sp.done && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            <p className="font-semibold">You&apos;re registered.</p>
            <p>
              We&apos;ve emailed you a confirmation. You can change your booking
              below until registration closes, or see it any time in{" "}
              <Link href="/me" className="underline underline-offset-4">
                your portal
              </Link>
              .
            </p>
          </div>
        )}
        {sp.cancelled && (
          <div className="rounded-md border bg-muted p-4 text-sm">
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
  event: NonNullable<Awaited<ReturnType<typeof prisma.event.findFirst>>>;
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
            include: { member: { select: { id: true, fullName: true } } },
          },
        },
      })
    : null;

  if (!open && !registration) return <Closed />;

  const household = member?.householdId
    ? await prisma.member.findMany({
        where: { householdId: member.householdId, id: { not: member.id } },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      })
    : [];

  // Pre-fill food/allergies from each person's most recent booking.
  const ids = [member?.id, ...household.map((h) => h.id)].filter(
    (id): id is string => !!id,
  );
  const previous = ids.length
    ? await prisma.eventAttendee.findMany({
        where: { memberId: { in: ids } },
        orderBy: { createdAt: "desc" },
        distinct: ["memberId"],
        select: { memberId: true, dietaryPreference: true, allergies: true },
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
        dietaryPreference: a.dietaryPreference ?? "",
        allergies: a.allergies ?? "",
        answers: (a.answers as Record<string, string | boolean>) ?? {},
      }))
    : null;

  return (
    <RegistrationForm
      // remount after save so new people become saved rows (no double-create)
      key={registration?.updatedAt.toISOString() ?? "new"}
      registerPath={registerPath}
      event={{
        id: event.id,
        slug: event.slug,
        type: event.type,
        fields: parseRegistrationFields(event.registrationFields),
      }}
      open={open}
      me={
        member
          ? {
              id: member.id,
              fullName: member.fullName,
              email: member.email ?? sessionUser.email,
              phone: member.phone,
            }
          : null
      }
      sessionUser={{ name: sessionUser.name, email: sessionUser.email }}
      household={household}
      previous={Object.fromEntries(
        previous.map((p) => [
          p.memberId,
          { dietaryPreference: p.dietaryPreference ?? "", allergies: p.allergies ?? "" },
        ]),
      )}
      defaultArrival={event.date.toISOString().slice(0, 10)}
      defaultOrigin={[member?.city, member?.country].filter(Boolean).join(", ")}
      existing={
        registration && existingRows
          ? {
              rows: existingRows,
              arrivalDate: registration.arrivalDate.toISOString().slice(0, 10),
              arrivalTime: registration.arrivalTime ?? "",
              travelMode: registration.travelMode ?? "",
              origin: registration.origin ?? "",
              notes: registration.notes ?? "",
              contactConsent: registration.contactConsent,
              answers: (registration.answers as Record<string, string | boolean>) ?? {},
            }
          : null
      }
    />
  );
}

function Closed() {
  return (
    <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
      Registration for this event is closed. Please contact the organisers if
      you need help.
    </div>
  );
}
