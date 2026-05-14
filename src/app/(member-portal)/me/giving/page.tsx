import Link from "next/link";
import { Download, HandHeart, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/database";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  formatCommitmentStatus,
  formatCurrency,
  formatDateShort,
  formatPaymentIntentStatus,
} from "@/lib/format";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "../_components/empty-state";

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
          Your commitments, payment status, and downloadable receipts.
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
                Browse PHANET projects
              </p>
              <p className="text-sm text-muted-foreground">
                Find a fundraising project to support today.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
          >
            <Link href="/projects">Give to a project</Link>
          </Button>
        </div>
      </div>

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
