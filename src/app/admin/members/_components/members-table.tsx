"use client";

import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper } from "@/app/components/data-table/features";
import type { MemberWithRelations } from "@/actions/members";
import { MemberRowActions } from "./member-row-actions";

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

const STATUS_LABEL: Record<string, string> = {
  VISITOR: "Visitor",
  PENDING_APPROVAL: "Pending",
  REGULAR: "Regular",
  MEMBER: "Member",
  INACTIVE: "Inactive",
  TRANSFERRED: "Transferred",
  DECEASED: "Deceased",
};

const STATUS_TONE: Record<string, string> = {
  VISITOR: "text-blue-600 border-blue-500/30 dark:text-blue-400",
  PENDING_APPROVAL: "text-amber-600 border-amber-500/30 dark:text-amber-400",
  REGULAR: "text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  MEMBER: "text-emerald-700 border-emerald-600/40 dark:text-emerald-300",
  INACTIVE: "text-muted-foreground",
  TRANSFERRED: "text-muted-foreground",
  DECEASED: "text-muted-foreground",
};

const AGE_LABEL: Record<string, string> = {
  under18: "Under 18",
  "18-29": "18–29",
  "30-49": "30–49",
  "50-69": "50–69",
  "70plus": "70+",
};

const col = columnHelper<MemberWithRelations>();

// Server-side table: sorting is only wired up for `name` and `joinDate`
// (see listMembers), so the other columns opt out.
const columns = col.columns([
  col.accessor("fullName", {
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Member" />
    ),
    enableHiding: false,
    cell: ({ row }) => {
      const m = row.original;
      return (
        <Link
          href={`/admin/members/${m.id}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="h-9 w-9">
            {m.photoUrl ? <AvatarImage src={m.photoUrl} alt={m.fullName} /> : null}
            <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
              {initials(m.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate group-hover:underline">
              {m.preferredName || m.fullName}
            </p>
            {m.preferredName && (
              <p className="text-xs text-muted-foreground truncate">
                {m.fullName}
              </p>
            )}
          </div>
        </Link>
      );
    },
  }),
  col.accessor((m) => [m.phone, m.email].filter(Boolean).join(" "), {
    id: "contact",
    header: "Contact",
    enableSorting: false,
    cell: ({ row }) => {
      const m = row.original;
      return (
        <div className="space-y-0.5 text-xs">
          {m.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3 w-3" /> {m.phone}
            </div>
          )}
          {m.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-3 w-3" /> {m.email}
            </div>
          )}
        </div>
      );
    },
  }),
  col.accessor((m) => m.units.map((u) => u.unit.name).join(", "), {
    id: "units",
    header: "Units",
    enableSorting: false,
    cell: ({ row }) => {
      const units = row.original.units;
      return (
        <div className="flex flex-wrap gap-1">
          {units.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            units.slice(0, 3).map((u) => (
              <Badge key={u.unitId} variant="outline" className="text-xs">
                {u.unit.name}
              </Badge>
            ))
          )}
          {units.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{units.length - 3}
            </span>
          )}
        </div>
      );
    },
  }),
  col.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant="outline" className={STATUS_TONE[row.original.status] ?? ""}>
        {STATUS_LABEL[row.original.status]}
      </Badge>
    ),
  }),
  col.accessor("joinDate", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Joined" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {row.original.joinDate
          ? new Date(row.original.joinDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—"}
      </span>
    ),
  }),
  col.display({
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <MemberRowActions
          memberId={row.original.id}
          status={row.original.status}
          email={row.original.email}
          userId={row.original.userId}
        />
      </div>
    ),
  }),
]);

export function MembersTable({
  items,
  total,
  units,
  tags,
}: {
  items: MemberWithRelations[];
  total: number;
  units: { id: string; name: string }[];
  tags: { id: string; label: string }[];
}) {
  return (
    <DataTable
      columns={columns}
      data={items}
      rowCount={total}
      searchPlaceholder="Search name, phone, email…"
      emptyMessage="No members yet."
      filters={[
        {
          id: "status",
          title: "Status",
          options: Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          })),
        },
        {
          id: "units",
          title: "Unit",
          options: units.map((u) => ({ value: u.id, label: u.name })),
        },
        {
          id: "tags",
          title: "Tag",
          options: tags.map((t) => ({ value: t.id, label: t.label })),
        },
        {
          id: "age",
          title: "Age",
          options: Object.entries(AGE_LABEL).map(([value, label]) => ({
            value,
            label,
          })),
        },
      ]}
    />
  );
}
