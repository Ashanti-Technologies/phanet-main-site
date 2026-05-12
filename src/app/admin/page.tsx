import Link from "next/link";
import { prisma } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-guard";
import { getBirthdays } from "@/actions/members";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  ArrowUpRight,
  Cake,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  Users,
} from "lucide-react";
import { KpiCard } from "./_components/kpi-card";
import { ActivityChart } from "./_components/activity-chart";
import { DateRangePicker } from "./_components/date-range-picker";

const DEFAULT_DAYS = 30;

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries<T>(
  rows: T[],
  getDate: (row: T) => Date,
  endDate: Date,
  days: number,
): { date: string; count: number }[] {
  const out = new Map<string, number>();
  const end = startOfDayUTC(endDate);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.set(isoDay(d), 0);
  }
  for (const row of rows) {
    const key = isoDay(startOfDayUTC(getDate(row)));
    if (out.has(key)) out.set(key, (out.get(key) ?? 0) + 1);
  }
  return Array.from(out, ([date, count]) => ({ date, count }));
}

function pctChange(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return ((current - prior) / prior) * 100;
}

type DateRange = {
  from: Date;
  to: Date;
  days: number;
  priorFrom: Date;
  priorTo: Date;
};

function parseRange(
  fromParam?: string,
  toParam?: string,
): DateRange {
  const today = startOfDayUTC(new Date());
  let to = today;
  let from = new Date(today);
  from.setUTCDate(today.getUTCDate() - (DEFAULT_DAYS - 1));

  if (fromParam && toParam) {
    const parsedFrom = new Date(fromParam);
    const parsedTo = new Date(toParam);
    if (!isNaN(parsedFrom.getTime()) && !isNaN(parsedTo.getTime())) {
      from = startOfDayUTC(parsedFrom);
      to = startOfDayUTC(parsedTo);
    }
  }

  const days =
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const priorTo = new Date(from);
  priorTo.setUTCDate(from.getUTCDate() - 1);
  const priorFrom = new Date(priorTo);
  priorFrom.setUTCDate(priorTo.getUTCDate() - (days - 1));

  return { from, to, days, priorFrom, priorTo };
}

async function getDashboardData(range: DateRange) {
  await requireAdmin();

  // Inclusive of `to`: extend by 1 day for `lt`/`lte` semantics
  const toExclusive = new Date(range.to);
  toExclusive.setUTCDate(range.to.getUTCDate() + 1);

  const [
    users,
    commitments30,
    commitmentsPrior30,
    confirmed30,
    confirmedPrior30,
    prayers30,
    prayersPrior30,
    users30,
    usersPrior30,
    topProjects,
    recentCommitments,
    recentPrayers,
    recentUsers,
    totalProjects,
    activeProjects,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.commitment.findMany({
      where: { createdAt: { gte: range.from, lt: toExclusive } },
      select: { createdAt: true, amountCommitted: true },
    }),
    prisma.commitment.count({
      where: { createdAt: { gte: range.priorFrom, lt: range.from } },
    }),
    prisma.commitment.findMany({
      where: {
        status: "CONFIRMED",
        confirmedAt: { gte: range.from, lt: toExclusive },
      },
      select: { confirmedAt: true, confirmedAmount: true, amountCommitted: true },
    }),
    prisma.commitment.findMany({
      where: {
        status: "CONFIRMED",
        confirmedAt: { gte: range.priorFrom, lt: range.from },
      },
      select: { confirmedAmount: true, amountCommitted: true },
    }),
    prisma.prayerRequest.findMany({
      where: { createdAt: { gte: range.from, lt: toExclusive } },
      select: { createdAt: true },
    }),
    prisma.prayerRequest.count({
      where: { createdAt: { gte: range.priorFrom, lt: range.from } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: range.from, lt: toExclusive } },
      select: { createdAt: true },
    }),
    prisma.user.count({
      where: { createdAt: { gte: range.priorFrom, lt: range.from } },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      include: {
        commitments: {
          where: { status: "CONFIRMED" },
          select: { amountCommitted: true, confirmedAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.commitment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        amountCommitted: true,
        status: true,
        createdAt: true,
        project: { select: { title: true, id: true } },
      },
    }),
    prisma.prayerRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, content: true, name: true, createdAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    }),
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
  ]);

  const raised30 = confirmed30.reduce(
    (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
    0,
  );
  const raisedPrior30 = confirmedPrior30.reduce(
    (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
    0,
  );

  const commitmentsSeries = buildDailySeries(
    commitments30,
    (c) => c.createdAt,
    range.to,
    range.days,
  );
  const prayersSeries = buildDailySeries(
    prayers30,
    (p) => p.createdAt,
    range.to,
    range.days,
  );
  const usersSeries = buildDailySeries(
    users30,
    (u) => u.createdAt,
    range.to,
    range.days,
  );
  const raisedSeries = (() => {
    const map = new Map<string, number>();
    const end = startOfDayUTC(range.to);
    for (let i = range.days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - i);
      map.set(isoDay(d), 0);
    }
    for (const c of confirmed30) {
      if (!c.confirmedAt) continue;
      const key = isoDay(startOfDayUTC(c.confirmedAt));
      if (map.has(key)) {
        map.set(
          key,
          (map.get(key) ?? 0) +
            Number(c.confirmedAmount ?? c.amountCommitted),
        );
      }
    }
    return Array.from(map, ([date, count]) => ({ date, count }));
  })();

  const topProjectsRanked = topProjects
    .map((p) => {
      const raised = p.commitments.reduce(
        (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
        0,
      );
      const target = Number(p.targetAmount);
      return {
        id: p.id,
        title: p.title,
        raised,
        target,
        progress: target > 0 ? Math.min((raised / target) * 100, 100) : 0,
      };
    })
    .sort((a, b) => b.raised - a.raised)
    .slice(0, 5);

  const activitySeries = commitmentsSeries.map((row, i) => ({
    date: row.date,
    commitments: row.count,
    prayers: prayersSeries[i]?.count ?? 0,
  }));

  return {
    totalUsers: users,
    totalProjects,
    activeProjects,
    commitments30Count: commitments30.length,
    commitmentsDelta: pctChange(commitments30.length, commitmentsPrior30),
    prayers30Count: prayers30.length,
    prayersDelta: pctChange(prayers30.length, prayersPrior30),
    users30Count: users30.length,
    usersDelta: pctChange(users30.length, usersPrior30),
    raised30,
    raisedDelta: pctChange(raised30, raisedPrior30),
    commitmentsSeries,
    prayersSeries,
    usersSeries,
    raisedSeries,
    activitySeries,
    topProjects: topProjectsRanked,
    recentCommitments,
    recentPrayers,
    recentUsers,
  };
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function relTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const dy = Math.floor(hr / 24);
  if (dy < 7) return `${dy}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const statusBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
};

type SearchParams = Promise<{ from?: string; to?: string }>;

function formatRangeLabel(range: DateRange): string {
  if (range.days === DEFAULT_DAYS) return "Last 30 days";
  return `${range.days}-day window`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = parseRange(params.from, params.to);
  const [data, birthdays] = await Promise.all([
    getDashboardData(range),
    getBirthdays(7).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of activity across the network — {formatRangeLabel(range)}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="w-fit gap-1.5 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </Badge>
          <DateRangePicker />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Commitments"
          value={data.commitments30Count.toLocaleString()}
          delta={data.commitmentsDelta}
          series={data.commitmentsSeries.map((r) => ({
            x: r.date,
            y: r.count,
          }))}
          positiveColor="var(--chart-1)"
        />
        <KpiCard
          title="Total raised"
          value={`GH₵ ${Math.round(data.raised30).toLocaleString()}`}
          delta={data.raisedDelta}
          series={data.raisedSeries.map((r) => ({ x: r.date, y: r.count }))}
          positiveColor="var(--chart-3)"
        />
        <KpiCard
          title="Prayer requests"
          value={data.prayers30Count.toLocaleString()}
          delta={data.prayersDelta}
          series={data.prayersSeries.map((r) => ({ x: r.date, y: r.count }))}
          positiveColor="var(--chart-2)"
        />
        <KpiCard
          title="New members"
          value={data.users30Count.toLocaleString()}
          delta={data.usersDelta}
          series={data.usersSeries.map((r) => ({ x: r.date, y: r.count }))}
          positiveColor="var(--chart-4)"
        />
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Commitments and prayer requests over the selected window.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--chart-1)" }}
                />
                Commitments
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--chart-2)" }}
                />
                Prayer requests
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityChart data={data.activitySeries} />
        </CardContent>
      </Card>

      {/* Lower grid: Recent activity + Top projects */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Recent activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  Latest commitments, prayer requests, and new members.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentCommitments.map((c) => (
              <ActivityRow
                key={`c-${c.id}`}
                icon={<HandCoins className="h-4 w-4" />}
                title={c.fullName}
                detail={
                  <>
                    committed{" "}
                    <span className="font-medium text-foreground">
                      GH₵ {Number(c.amountCommitted).toLocaleString()}
                    </span>{" "}
                    to{" "}
                    <Link
                      href={`/admin/projects/${c.project.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.project.title}
                    </Link>
                  </>
                }
                badge={
                  <Badge
                    variant={
                      statusBadgeVariant[c.status as string] ?? "secondary"
                    }
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {c.status}
                  </Badge>
                }
                when={relTime(c.createdAt)}
              />
            ))}
            {data.recentPrayers.map((p) => (
              <ActivityRow
                key={`p-${p.id}`}
                icon={<HeartHandshake className="h-4 w-4" />}
                title={p.name ?? "Anonymous"}
                detail={
                  <>
                    shared a prayer request:{" "}
                    <span className="text-foreground">
                      {p.content.length > 80
                        ? p.content.slice(0, 80) + "…"
                        : p.content}
                    </span>
                  </>
                }
                when={relTime(p.createdAt)}
              />
            ))}
            {data.recentUsers.map((u) => (
              <ActivityRow
                key={`u-${u.id}`}
                avatar={{ name: u.name ?? "User", image: u.image }}
                title={u.name ?? "New member"}
                detail={<>joined PHANET — {u.email}</>}
                when={relTime(u.createdAt)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Top projects */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top projects</CardTitle>
                <CardDescription>By total raised</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/admin/projects"
                  className="text-muted-foreground hover:text-foreground"
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topProjects.length === 0 ? (
              <EmptyHint
                icon={<FolderKanban className="h-5 w-5" />}
                label="No active projects yet"
              />
            ) : (
              data.topProjects.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      GH₵ {Math.round(p.raised).toLocaleString()} /{" "}
                      {Math.round(p.target).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/85 transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Birthdays */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-4 w-4" />
                Upcoming birthdays
              </CardTitle>
              <CardDescription>
                Members celebrating in the next 7 days.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/admin/members"
                className="text-muted-foreground hover:text-foreground"
              >
                Directory <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {birthdays.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No birthdays in the next week.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {birthdays.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/members/${b.id}`}
                  className="flex items-center gap-3 rounded-md border p-2.5 hover:bg-muted/40"
                >
                  <Avatar className="h-8 w-8">
                    {b.photoUrl ? (
                      <AvatarImage src={b.photoUrl} alt={b.fullName} />
                    ) : null}
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      {initials(b.preferredName ?? b.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {b.preferredName ?? b.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.dob).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FooterStat
          label="Total users"
          value={data.totalUsers.toLocaleString()}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <FooterStat
          label="Active projects"
          value={`${data.activeProjects} / ${data.totalProjects}`}
          icon={<FolderKanban className="h-3.5 w-3.5" />}
        />
        <FooterStat
          label="Prayer requests"
          value={data.prayers30Count.toLocaleString()}
          icon={<HeartHandshake className="h-3.5 w-3.5" />}
        />
        <FooterStat
          label="Raised in window"
          value={`GH₵ ${Math.round(data.raised30).toLocaleString()}`}
          icon={<HandCoins className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}

function ActivityRow({
  icon,
  avatar,
  title,
  detail,
  badge,
  when,
}: {
  icon?: React.ReactNode;
  avatar?: { name: string; image?: string | null };
  title: string;
  detail: React.ReactNode;
  badge?: React.ReactNode;
  when: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md py-2.5 px-1 -mx-1 hover:bg-muted/40 transition-colors">
      <div className="shrink-0 mt-0.5">
        {avatar ? (
          <Avatar className="h-7 w-7">
            {avatar.image ? (
              <AvatarImage src={avatar.image} alt={avatar.name} />
            ) : null}
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
              {initials(avatar.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{detail}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {when}
      </span>
    </div>
  );
}

function FooterStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyHint({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 text-muted-foreground">
      {icon}
      <p className="text-xs">{label}</p>
    </div>
  );
}
