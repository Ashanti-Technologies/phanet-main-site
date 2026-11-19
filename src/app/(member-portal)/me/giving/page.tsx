import Link from "next/link";
import { Download, HandHeart, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/database";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/finance.schema";
import {
  formatCommitmentStatus,
  formatCurrency,
  formatMoney,
  formatDateShort,
  formatPaymentIntentStatus,
} from "@/lib/format";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "../_components/empty-state";
import { PayPledgeButton } from "./_components/pay-pledge-button";
import { CancelMonthlyButton } from "./_components/cancel-monthly-button";

export default async function MemberGivingPage() {
  const { session, member } = await getCurrentMemberOrRedirect();
  const emails = Array.from(
    new Set(
      [member.email, session.user.email]
        .filter(Boolean)
        .map((email) => String(email).toLowerCase()),
    ),
  );
  const commitments = emails.length
    ? await prisma.commitment.findMany({
        where: { email: { in: emails } },
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, title: true } },
          paymentIntents: { orderBy: { createdAt: "desc" } },
        },
      })
    : [];

  // Gifts recorded in the finance ledger (online, MoMo, cash…) linked to this member.
  const gifts = await prisma.income.findMany({
    // Event registration fees aren't gifts.
    where: { memberId: member.id, voidedAt: null, eventRegistrationId: null },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      amount: true,
      receivedAt: true,
      method: true,
      fund: { select: { name: true } },
      commitment: { select: { project: { select: { title: true } } } },
    },
  });
  const monthlyGifts = await prisma.recurringGift.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      cardLabel: true,
      nextChargeAt: true,
      fund: { select: { name: true } },
    },
  });
  const giftYears = new Map<number, { total: number; count: number }>();
  for (const g of gifts) {
    const y = g.receivedAt.getUTCFullYear();
    const cur = giftYears.get(y) ?? { total: 0, count: 0 };
    giftYears.set(y, { total: cur.total + g.amount.toNumber(), count: cur.count + 1 });
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const lifetimeTotal = commitments
    .filter((c) => c.status === "CONFIRMED")
    .reduce(
      (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
      0,
    );
  const ytdTotal = commitments
    .filter((c) => c.status === "CONFIRMED" && c.createdAt >= yearStart)
    .reduce(
      (sum, c) => sum + Number(c.confirmedAmount ?? c.amountCommitted),
      0,
    );
  const projectCount = new Set(
    commitments
      .filter((c) => c.status === "CONFIRMED")
      .map((c) => c.project.id),
  ).size;

  // Group by year (most recent first).
  const groups = new Map<number, typeof commitments>();
  for (const c of commitments) {
    const year = c.createdAt.getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(c);
  }
  const sortedYears = Array.from(groups.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Giving</h1>
        <p className="text-sm text-muted-foreground">
          Your gifts, commitments, payment status, and downloadable statements.
        </p>
      </div>

      {/* Hero CTA */}
      <div className="rounded-2xl border bg-gradient-to-br from-mikado-yellow/15 to-mikado-yellow/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-mikado-yellow/30 p-2 text-midnight-green">
              <HandHeart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-midnight-green">
                Support the work of PHANET
              </p>
              <p className="text-sm text-muted-foreground">
                Give your tithe or offering online, or back a fundraising project.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/projects">Give to a project</Link>
            </Button>
            <Button
              asChild
              className="bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
            >
              <Link href="/give">Give online</Link>
            </Button>
          </div>
        </div>
      </div>

      {monthlyGifts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-midnight-green">Monthly gifts</h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            {monthlyGifts.map((m, idx) => (
              <div
                key={m.id}
                className={"flex flex-wrap items-center justify-between gap-4 p-4" + (idx > 0 ? " border-t" : "")}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatMoney(m.amount)} / month · {m.fund.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.status === "PAUSED"
                      ? "Paused — your card was declined. Set up a new monthly gift to continue."
                      : `Next charge ${m.nextChargeAt ? formatDateShort(m.nextChargeAt) : "—"}`}
                    {m.cardLabel ? ` · ${m.cardLabel}` : ""}
                  </p>
                </div>
                <CancelMonthlyButton id={m.id} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {gifts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-midnight-green">Your gifts</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(giftYears, ([year, { total, count }]) => (
              <div key={year} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{year}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-midnight-green">{formatMoney(total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} gift{count === 1 ? "" : "s"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={`/api/me/statements/${year}`} target="_blank" rel="noopener">
                    <Download className="h-3.5 w-3.5" />
                    Statement
                  </a>
                </Button>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            {gifts.slice(0, 10).map((g, idx) => (
              <div
                key={g.id}
                className={"flex items-center justify-between gap-4 p-4" + (idx > 0 ? " border-t" : "")}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {g.commitment ? `${g.commitment.project.title} (pledge)` : g.fund.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateShort(g.receivedAt)} · {PAYMENT_METHOD_LABELS[g.method]}
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-midnight-green">{formatMoney(g.amount)}</p>
              </div>
            ))}
          </div>
          {gifts.length > 10 ? (
            <p className="text-xs text-muted-foreground">
              Showing your 10 most recent gifts. Download a statement for the full year.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Totals strip */}
      {commitments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="This year" value={formatCurrency(ytdTotal)} />
          <Stat
            label="Lifetime confirmed"
            value={formatCurrency(lifetimeTotal)}
          />
          <Stat label="Projects supported" value={String(projectCount)} />
        </div>
      ) : null}

      {/* Commitments grouped by year */}
      {commitments.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No commitments yet"
          description="When you commit to a PHANET project, it'll show up here."
          action={{ label: "Browse projects", href: "/projects" }}
        />
      ) : (
        <div className="space-y-6">
          {sortedYears.map((year) => (
            <section key={year} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-midnight-green">
                  {year}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {groups.get(year)!.length} commitment
                  {groups.get(year)!.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border bg-card">
                {groups.get(year)!.map((commitment, idx) => {
                  const amount = Number(
                    commitment.confirmedAmount ?? commitment.amountCommitted,
                  );
                  const paymentStatus =
                    commitment.paymentIntents[0]?.status ?? null;
                  const isConfirmed = commitment.status === "CONFIRMED";
                  // Pay-now only for the user's own pledges (the list also matches by email).
                  const canPay =
                    commitment.userId === session.user.id &&
                    commitment.status !== "CANCELLED" &&
                    Number(commitment.confirmedAmount ?? 0) < Number(commitment.amountCommitted);
                  return (
                    <div
                      key={commitment.id}
                      className={
                        "flex flex-wrap items-start justify-between gap-4 p-4 sm:items-center" +
                        (idx > 0 ? " border-t" : "")
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {commitment.project.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDateShort(commitment.createdAt)}</span>
                          <span>·</span>
                          <Badge
                            variant="outline"
                            className={
                              isConfirmed
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : commitment.status === "CANCELLED"
                                  ? "border-rose-300 bg-rose-50 text-rose-900"
                                  : "border-amber-300 bg-amber-50 text-amber-900"
                            }
                          >
                            {formatCommitmentStatus(commitment.status)}
                          </Badge>
                          {paymentStatus ? (
                            <span className="text-muted-foreground">
                              · {formatPaymentIntentStatus(paymentStatus)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-base font-semibold tracking-tight text-midnight-green">
                          {formatCurrency(amount)}
                        </p>
                        {canPay ? <PayPledgeButton commitmentId={commitment.id} /> : null}
                        {isConfirmed ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                          >
                            <a
                              href={`/api/me/receipts/${commitment.id}`}
                              target="_blank"
                              rel="noopener"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Receipt
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-midnight-green">
        {value}
      </p>
    </div>
  );
}
