import { prisma } from "@/lib/database";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

export default async function MemberGivingPage() {
  const { session, member } = await getCurrentMemberOrRedirect();
  const emails = Array.from(
    new Set([member.email, session.user.email].filter(Boolean).map((email) => String(email).toLowerCase())),
  );
  const commitments = emails.length
    ? await prisma.commitment.findMany({
        where: { email: { in: emails } },
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { title: true } },
          paymentIntents: { orderBy: { createdAt: "desc" } },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Giving</h1>
        <p className="text-sm text-muted-foreground">
          Read-only giving history matched to your email.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commitments</CardTitle>
        </CardHeader>
        <CardContent>
          {commitments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No commitments matched to your profile.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment intents</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((commitment) => (
                  <TableRow key={commitment.id}>
                    <TableCell>
                      <p className="font-medium">{commitment.project.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {commitment.createdAt.toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>{commitment.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {commitment.paymentIntents.length === 0
                        ? "None"
                        : commitment.paymentIntents
                            .map((intent) => intent.status)
                            .join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      GH₵{" "}
                      {Number(
                        commitment.confirmedAmount ??
                          commitment.amountCommitted,
                      ).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
