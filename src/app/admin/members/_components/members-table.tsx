import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
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

export function MembersTable({ items }: { items: MemberWithRelations[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%]">Member</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No members match your filters.
              </TableCell>
            </TableRow>
          ) : (
            items.map((m) => (
              <TableRow key={m.id} className="hover:bg-muted/40">
                <TableCell>
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <Avatar className="h-9 w-9">
                      {m.photoUrl ? (
                        <AvatarImage src={m.photoUrl} alt={m.fullName} />
                      ) : null}
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
                </TableCell>
                <TableCell className="text-xs">
                  <div className="space-y-0.5">
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
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.units.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      m.units.slice(0, 3).map((u) => (
                        <Badge
                          key={u.unitId}
                          variant="outline"
                          className="text-xs"
                        >
                          {u.unit.name}
                        </Badge>
                      ))
                    )}
                    {m.units.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{m.units.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_TONE[m.status] ?? ""}
                  >
                    {STATUS_LABEL[m.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {m.joinDate
                    ? new Date(m.joinDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <MemberRowActions
                    memberId={m.id}
                    status={m.status}
                    email={m.email}
                    userId={m.userId}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
