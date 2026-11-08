import { notFound } from "next/navigation";
import { getBatch } from "@/actions/messages";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { MessageLogsTable } from "../../_components/message-tables";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {batch.name}
        </h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline">{batch.channel}</Badge>
          <Badge variant="outline">{batch.status}</Badge>
          {batch.template && (
            <Badge variant="outline">Template: {batch.template.name}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Recipients" value={batch.recipients} />
        <Stat
          label="Delivered"
          value={batch.successes}
          tone="emerald"
        />
        <Stat label="Failed" value={batch.failures} tone="rose" />
        <Stat
          label="Sent at"
          value={
            batch.finishedAt
              ? batch.finishedAt.toLocaleString()
              : "—"
          }
        />
      </div>

      {batch.subject && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{batch.subject}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Body</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-md overflow-x-auto">
            {batch.body}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Per-recipient log ({batch.logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessageLogsTable logs={batch.logs} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "emerald" | "rose";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "rose"
        ? "text-rose-700 dark:text-rose-300"
        : "";
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums mt-1 ${color}`}>
        {value}
      </p>
    </div>
  );
}
