import Link from "next/link";
import { prisma } from "@/lib/database";
import {
  getCurrentMemberOrRedirect,
  normalizedPhoneVariants,
} from "@/lib/member-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

export default async function MemberPortalPage() {
  const { session, member } = await getCurrentMemberOrRedirect();
  const emails = [member.email, session.user.email].filter(Boolean) as string[];
  const phones = normalizedPhoneVariants(member.phone);
  const today = new Date();

  const [events, prayers, commitments] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED", date: { gte: today } },
      orderBy: { date: "asc" },
      take: 5,
      include: { rsvps: { where: { memberId: member.id } } },
    }),
    prisma.prayerRequest.findMany({
      where: {
        OR: [
          ...emails.map((email) => ({ email: email.toLowerCase() })),
          ...phones.map((phone) => ({ phone })),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    emails.length
      ? prisma.commitment.findMany({
          where: { email: { in: emails.map((email) => email.toLowerCase()) } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
  ]);

  const confirmedTotal = commitments
    .filter((commitment) => commitment.status === "CONFIRMED")
    .reduce(
      (sum, commitment) =>
        sum + Number(commitment.confirmedAmount ?? commitment.amountCommitted),
      0,
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {member.preferredName || member.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your PHANET profile, events, prayer requests, and giving at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upcoming events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{events.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prayer requests</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{prayers.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confirmed giving</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            GH₵ {confirmedTotal.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Events</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/me/events">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.date.toLocaleDateString()} · {event.time}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent prayer requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No prayer requests matched to your profile.
              </p>
            ) : (
              prayers.map((prayer) => (
                <div key={prayer.id} className="rounded-md border p-3">
                  <p className="line-clamp-3 text-sm">{prayer.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {prayer.status} · {prayer.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
