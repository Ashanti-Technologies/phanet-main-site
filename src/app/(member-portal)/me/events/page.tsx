import { prisma } from "@/lib/database";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { EventsRsvpList } from "./_components/events-rsvp-list";

export default async function MemberEventsPage() {
  const { member } = await getCurrentMemberOrRedirect();
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", date: { gte: new Date() } },
    orderBy: { date: "asc" },
    include: { rsvps: { where: { memberId: member.id } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          RSVP to upcoming PHANET gatherings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming events</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsRsvpList
            events={events.map((event) => ({
              id: event.id,
              title: event.title,
              date: event.date.toISOString(),
              time: event.time,
              location: event.location,
              rsvpStatus: event.rsvps[0]?.status ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
