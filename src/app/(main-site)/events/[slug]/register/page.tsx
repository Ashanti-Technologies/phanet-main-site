import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin } from "lucide-react";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { getKnownPeople, isRegistrationOpen } from "@/lib/event-registration";
import { registerLocation } from "@/lib/event-subdomain";
import { formatEventDate } from "@/lib/events";
import {
  parseRegistrationFields,
  type Answers,
} from "@/lib/schemas/event-registration.schema";
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

        {sp.done && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">You&apos;re registered.</p>
              <p>
                We&apos;ve emailed you a confirmation. You can change your
                booking below until registration closes, or see it any time in{" "}
                <Link href="/me" className="underline underline-offset-4">
                  your portal
                </Link>
                .
              </p>
            </div>
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
        answers: (a.answers as Answers) ?? {},
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
        fields,
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
