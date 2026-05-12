import Link from "next/link";
import { listBatches } from "@/actions/messages";
import { Badge } from "@/app/components/ui/badge";
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

const STATUS_TONE: Record<string, string> = {
  QUEUED: "text-muted-foreground",
  SENDING: "text-blue-600 border-blue-500/30 dark:text-blue-400",
  SENT: "text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  PARTIAL: "text-amber-700 border-amber-500/40 dark:text-amber-300",
  FAILED: "text-rose-700 border-rose-500/40 dark:text-rose-300",
};

export default async function BatchesPage() {
  const batches = await listBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sent batches</h1>
        <p className="text-sm text-muted-foreground">
          History of bulk email and SMS sends.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 100 batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No batches sent yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Link
                          href={`/admin/messages/batches/${b.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {b.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {b.successes} / {b.recipients}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_TONE[b.status] ?? ""}
                        >
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {(b.finishedAt ?? b.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
