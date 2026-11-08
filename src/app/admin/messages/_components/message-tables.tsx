"use client";

import Link from "next/link";
import type {
  MessageBatch,
  MessageLog,
  MessageTemplate,
} from "@/app/generated/prisma/client";
import { Badge } from "@/app/components/ui/badge";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import {
  columnHelper,
  facetFilterFn,
} from "@/app/components/data-table/features";
import type { FacetOption } from "@/app/components/data-table/data-table-faceted-filter";

const options = (values: string[]): FacetOption[] =>
  values.map((value) => ({ value, label: value }));

const CHANNELS = options(["EMAIL", "SMS"]);

// ---------------------------------------------------------------- Templates

const tpl = columnHelper<MessageTemplate>();

const templateColumns = tpl.columns([
  tpl.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/messages/templates/${row.original.id}`}
        className="text-sm font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  tpl.accessor("channel", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Channel" />,
    filterFn: facetFilterFn,
    cell: ({ row }) => <Badge variant="outline">{row.original.channel}</Badge>,
  }),
  tpl.accessor((t) => t.subject || t.body.slice(0, 80), {
    id: "preview",
    header: "Subject / preview",
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-xs text-muted-foreground max-w-xl truncate">
        {getValue()}
      </div>
    ),
  }),
]);

export function TemplatesTable({ templates }: { templates: MessageTemplate[] }) {
  return (
    <DataTable
      columns={templateColumns}
      data={templates}
      searchPlaceholder="Search templates…"
      emptyMessage="No templates yet."
      filters={[{ id: "channel", title: "Channel", options: CHANNELS }]}
    />
  );
}

// ------------------------------------------------------------------ Batches

const BATCH_TONE: Record<string, string> = {
  QUEUED: "text-muted-foreground",
  SENDING: "text-blue-600 border-blue-500/30 dark:text-blue-400",
  SENT: "text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  PARTIAL: "text-amber-700 border-amber-500/40 dark:text-amber-300",
  FAILED: "text-rose-700 border-rose-500/40 dark:text-rose-300",
};

const batch = columnHelper<MessageBatch>();

const batchColumns = batch.columns([
  batch.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/messages/batches/${row.original.id}`}
        className="text-sm font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  batch.accessor("channel", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Channel" />,
    filterFn: facetFilterFn,
    cell: ({ row }) => <Badge variant="outline">{row.original.channel}</Badge>,
  }),
  batch.accessor("recipients", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recipients" />
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.successes} / {row.original.recipients}
      </span>
    ),
  }),
  batch.accessor("status", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    filterFn: facetFilterFn,
    cell: ({ row }) => (
      <Badge variant="outline" className={BATCH_TONE[row.original.status] ?? ""}>
        {row.original.status}
      </Badge>
    ),
  }),
  batch.accessor((b) => b.finishedAt ?? b.createdAt, {
    id: "sent",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sent" />,
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {getValue().toLocaleString()}
      </span>
    ),
  }),
]);

export function BatchesTable({ batches }: { batches: MessageBatch[] }) {
  return (
    <DataTable
      columns={batchColumns}
      data={batches}
      searchPlaceholder="Search batches…"
      emptyMessage="No batches sent yet."
      filters={[
        { id: "channel", title: "Channel", options: CHANNELS },
        { id: "status", title: "Status", options: options(Object.keys(BATCH_TONE)) },
      ]}
    />
  );
}

// ------------------------------------------------------- Per-recipient logs

const DELIVERY_TONE: Record<string, string> = {
  QUEUED: "text-muted-foreground",
  SENT: "text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  DELIVERED: "text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  FAILED: "text-rose-700 border-rose-500/40 dark:text-rose-300",
  BOUNCED: "text-amber-700 border-amber-500/40 dark:text-amber-300",
};

const log = columnHelper<MessageLog>();

const logColumns = log.columns([
  log.accessor("recipient", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recipient" />
    ),
    enableHiding: false,
    cell: ({ row }) => <span className="text-sm">{row.original.recipient}</span>,
  }),
  log.accessor("status", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    filterFn: facetFilterFn,
    cell: ({ row }) => (
      <Badge variant="outline" className={DELIVERY_TONE[row.original.status] ?? ""}>
        {row.original.status}
      </Badge>
    ),
  }),
  log.accessor((l) => l.providerRef ?? "", {
    id: "providerRef",
    header: "Provider ref",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        {row.original.providerRef ?? "—"}
      </span>
    ),
  }),
  log.accessor((l) => l.error ?? "", {
    id: "error",
    header: "Error",
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-xs text-rose-700 dark:text-rose-400 max-w-md truncate">
        {getValue()}
      </div>
    ),
  }),
]);

export function MessageLogsTable({ logs }: { logs: MessageLog[] }) {
  return (
    <DataTable
      columns={logColumns}
      data={logs}
      searchPlaceholder="Search recipients…"
      emptyMessage="No recipients."
      filters={[
        {
          id: "status",
          title: "Status",
          options: options(Object.keys(DELIVERY_TONE)),
        },
      ]}
    />
  );
}
