import { CalendarClock, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/database";
import {
  getCurrentMemberOrRedirect,
  normalizedPhoneVariants,
} from "@/lib/member-portal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { EventsTab } from "./_components/events-tab";
import { PrayerTab } from "./_components/prayer-tab";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; events?: string }>;
}) {
  const { session, member } = await getCurrentMemberOrRedirect();
  const params = (await searchParams) ?? {};
  const tab = params.tab === "prayer" ? "prayer" : "events";
  const eventsFilter =
    params.events === "past"
      ? "past"
      : params.events === "rsvp"
        ? "rsvp"
        : "upcoming";
  const today = new Date();

  const eventsWhere =
    eventsFilter === "past"
      ? { status: "PUBLISHED" as const, date: { lt: today } }
      : eventsFilter === "rsvp"
        ? {
            status: "PUBLISHED" as const,
            rsvps: {
              some: { memberId: member.id, status: "GOING" as const },
            },
          }
        : { status: "PUBLISHED" as const, date: { gte: today } };

  const emails = Array.from(
    new Set(
      [member.email, session.user.email]
        .filter(Boolean)
        .map((e) => String(e).toLowerCase()),
    ),
  );
  const phones = normalizedPhoneVariants(member.phone);

  const [events, prayers] = await Promise.all([
    prisma.event.findMany({
      where: eventsWhere,
      orderBy: { date: eventsFilter === "past" ? "desc" : "asc" },
      take: 25,
      include: { rsvps: { where: { memberId: member.id } } },
    }),
    prisma.prayerRequest.findMany({
      where:
        emails.length || phones.length
          ? {
              OR: [
                ...emails.map((email) => ({ email })),
                ...phones.map((phone) => ({ phone })),
              ],
            }
          : { id: "__none__" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connect</h1>
        <p className="text-sm text-muted-foreground">
          Stay close to PHANET — RSVP to upcoming gatherings and share what
          you&apos;d like prayer for.
        </p>
      </div>

      <Tabs defaultValue={tab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="events" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="prayer" className="gap-2">
            <HeartHandshake className="h-4 w-4" />
            Prayer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsTab
            filter={eventsFilter}
            events={events.map((event) => ({
              id: event.id,
              slug: event.slug,
              title: event.title,
              date: event.date.toISOString(),
              time: event.time,
              location: event.location,
              rsvpStatus: event.rsvps[0]?.status ?? null,
            }))}
          />
        </TabsContent>

        <TabsContent value="prayer" className="space-y-6">
          <PrayerTab
            defaultName={member.preferredName || member.fullName}
            defaultEmail={member.email || session.user.email || ""}
            defaultPhone={member.phone || ""}
            requests={prayers.map((p) => ({
              id: p.id,
              content: p.content,
              status: p.status,
              createdAt: p.createdAt.toISOString(),
              prayedAt: p.prayedAt?.toISOString() ?? null,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
