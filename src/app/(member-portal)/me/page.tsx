import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  HandHeart,
  HeartHandshake,
  MapPin,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/database";
import {
  computeProfileCompleteness,
  getCurrentMemberOrRedirect,
  normalizedPhoneVariants,
} from "@/lib/member-portal";
import {
  formatCurrency,
  formatDateMedium,
  formatPrayerStatus,
  timeOfDayGreeting,
} from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "./_components/empty-state";
import { DashboardEventRsvp } from "./_components/dashboard-event-rsvp";

export default async function MemberPortalPage() {
  const { session, member } = await getCurrentMemberOrRedirect();
  const emails = Array.from(
    new Set(
      [member.email, session.user.email]
        .filter(Boolean)
        .map((e) => String(e).toLowerCase()),
    ),
  );
  const phones = normalizedPhoneVariants(member.phone);
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const [nextEventRow, latestPrayer, commitments] = await Promise.all([
    prisma.event.findFirst({
      where: { status: "PUBLISHED", date: { gte: today } },
      orderBy: { date: "asc" },
      include: { rsvps: { where: { memberId: member.id } } },
    }),
    prisma.prayerRequest.findFirst({
      where: {
        OR: [
          ...emails.map((email) => ({ email })),
          ...phones.map((phone) => ({ phone })),
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    emails.length
      ? prisma.commitment.findMany({
          where: { email: { in: emails } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            amountCommitted: true,
            confirmedAmount: true,
            createdAt: true,
            projectId: true,
          },
        })
      : [],
  ]);

  const ytdConfirmed = commitments
    .filter(
      (c) => c.status === "CONFIRMED" && c.createdAt >= yearStart,
    )
    .reduce(
      (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
      0,
    );
  const lifetimeConfirmed = commitments
    .filter((c) => c.status === "CONFIRMED")
    .reduce(
      (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
      0,
    );
  const projectCount = new Set(
    commitments
      .filter((c) => c.status === "CONFIRMED")
      .map((c) => c.projectId),
  ).size;

  const completeness = computeProfileCompleteness(member);
  const firstName =
    (member.preferredName || member.fullName || "").split(" ")[0] || "Friend";
  const greeting = timeOfDayGreeting();
  const needsConfirmation = !member.phanetProfile?.formSubmittedAt;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-midnight-green via-midnight-green to-[#0a4d62] text-white shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-medium text-mikado-yellow">
              {greeting}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {firstName}, welcome back.
            </h1>
            <p className="max-w-prose text-sm text-white/80">
              Here&apos;s what&apos;s happening in your PHANET life today —
              upcoming gatherings, your prayer wall, and your generosity at a
              glance.
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-mikado-yellow">
                Profile completeness
              </span>
              <span className="text-white/80">
                {completeness.filled} / {completeness.total}
              </span>
            </div>
            <Progress
              value={completeness.percent}
              className="h-2 bg-white/20 [&>div]:bg-mikado-yellow"
            />
            <p className="mt-3 text-xs text-white/70">
              {needsConfirmation
                ? "Please review and confirm your details so we can serve you better."
                : `${completeness.percent}% complete — keep your details fresh anytime.`}
            </p>
            <Button
              asChild
              size="sm"
              className="mt-4 w-full bg-mikado-yellow text-midnight-green hover:bg-mikado-yellow/90"
            >
              <Link href="/me/profile">
                {needsConfirmation
                  ? "Review my details"
                  : "Update my profile"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What's next + Prayer wall */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-midnight-green" />
              What&apos;s next
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/me/connect?tab=events">
                All events
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {nextEventRow ? (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold leading-tight">
                    {nextEventRow.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDateMedium(nextEventRow.date)} · {nextEventRow.time}
                    </span>
                    {nextEventRow.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {nextEventRow.location}
                      </span>
                    ) : null}
                  </div>
                </div>
                <DashboardEventRsvp
                  eventId={nextEventRow.id}
                  initialStatus={
                    nextEventRow.rsvps[0]?.status ?? null
                  }
                />
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Nothing on the calendar yet"
                description="When the next gathering is announced you'll see it here first."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-midnight-green" />
              Your prayer wall
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/me/connect?tab=prayer">
                All requests
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestPrayer ? (
              <div className="space-y-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {formatPrayerStatus(latestPrayer.status)}
                  </Badge>
                  <p className="line-clamp-3 text-sm text-foreground">
                    {latestPrayer.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {formatDateMedium(latestPrayer.createdAt)}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Link href="/me/connect?tab=prayer">
                    Submit a new request
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={HeartHandshake}
                title="Your prayer wall is quiet"
                description="Share a request and our team will lift it up with you."
                action={{
                  label: "Submit a prayer request",
                  href: "/me/connect?tab=prayer",
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Giving */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[1fr_auto] sm:items-center">
          <CardHeader className="flex flex-row items-start gap-3 sm:items-center">
            <div className="rounded-full bg-mikado-yellow/20 p-2 text-midnight-green">
              <HandHeart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Your giving this year</CardTitle>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-midnight-green">
                {formatCurrency(ytdConfirmed)}
              </p>
              <p className="text-xs text-muted-foreground">
                Across {projectCount} project{projectCount === 1 ? "" : "s"} ·
                Lifetime {formatCurrency(lifetimeConfirmed)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 sm:justify-end sm:py-6">
            <Button
              asChild
              className="bg-mikado-yellow text-midnight-green hover:bg-mikado-yellow/90"
            >
              <Link href="/projects">Give to a project</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/me/giving">View giving history</Link>
            </Button>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
