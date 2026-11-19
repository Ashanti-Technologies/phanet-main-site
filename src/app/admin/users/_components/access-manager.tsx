"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, Users } from "lucide-react";
import { isUnitScopable } from "@/lib/rbac/catalog";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper, facetFilterFn } from "@/app/components/data-table/features";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PersonSheet, RoleSheet, UserAvatar, fmtDate } from "./access-sheets";
import { GrantDialog, type GrantUser } from "./grant-dialog";

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  assignmentCount: number;
};
export type AccessMode = "super" | "delegate";
export type UnitRow = { id: string; name: string; isActive: boolean };
export type AssignmentRow = {
  id: string;
  roleId: string;
  unitId: string | null;
  expiresAt: string | null;
  expired: boolean;
  createdAt: string;
  grantedBy: string | null;
  canRevoke: boolean;
  user: GrantUser;
};

type PersonRow = {
  id: string;
  user: GrantUser;
  items: AssignmentRow[];
  /** name + email, for the search box */
  person: string;
  /** active role ids */
  roles: string[];
  /** active scopes: unit ids or EVERYWHERE */
  scopes: string[];
  /** soonest active end date (ISO) or "" */
  expires: string;
};
type RoleTableRow = RoleRow & { kind: "built-in" | "custom" };

const EVERYWHERE = "everywhere";
const personCol = columnHelper<PersonRow>();
const roleCol = columnHelper<RoleTableRow>();

export function AccessManager({
  tab,
  mode,
  grantable,
  me,
  roles,
  units,
  assignments,
}: {
  tab: "people" | "roles";
  mode: AccessMode;
  grantable: Record<string, string[]>;
  me: string;
  roles: RoleRow[];
  units: UnitRow[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const [grantFor, setGrantFor] = useState<GrantUser | null | undefined>(undefined);
  const [personId, setPersonId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const people = useMemo(() => {
    const byUser = new Map<string, PersonRow>();
    for (const a of assignments) {
      const row = byUser.get(a.user.id) ?? {
        id: a.user.id,
        user: a.user,
        items: [],
        person: `${a.user.name} ${a.user.email}`,
        roles: [],
        scopes: [],
        expires: "",
      };
      row.items.push(a);
      if (!a.expired) {
        row.roles.push(a.roleId);
        row.scopes.push(a.unitId ?? EVERYWHERE);
        if (a.expiresAt && (!row.expires || a.expiresAt < row.expires)) row.expires = a.expiresAt;
      }
      byUser.set(a.user.id, row);
    }
    return [...byUser.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [assignments]);

  const roleRows = useMemo(
    () => roles.map((r): RoleTableRow => ({ ...r, kind: r.isSystem ? "built-in" : "custom" })),
    [roles],
  );

  const peopleColumns = useMemo(
    () =>
      personCol.columns([
        personCol.accessor("person", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Person" />,
          enableHiding: false,
          cell: ({ row: { original: p } }) => (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar user={p.user} className="h-8 w-8" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {p.user.name}
                  {p.user.id === me && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{p.user.email}</p>
              </div>
            </div>
          ),
        }),
        personCol.accessor("roles", {
          header: "Roles",
          enableSorting: false,
          filterFn: facetFilterFn,
          cell: ({ row: { original: p } }) =>
            p.roles.length ? (
              <div className="flex flex-wrap gap-1">
                {[...new Set(p.roles)].map((id) => (
                  <Badge key={id} variant="secondary">{roleById.get(id)?.name ?? "Deleted role"}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Expired</span>
            ),
        }),
        personCol.accessor("scopes", {
          header: "Scope",
          enableSorting: false,
          filterFn: facetFilterFn,
          cell: ({ row: { original: p } }) => (
            <span className="text-sm text-muted-foreground">
              {[...new Set(p.scopes)]
                .map((s) => (s === EVERYWHERE ? "Everywhere" : `${unitName.get(s) ?? "Unit"} only`))
                .join(", ") || "—"}
            </span>
          ),
        }),
        personCol.accessor("expires", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
          cell: ({ row: { original: p } }) => (
            <span className="text-sm tabular-nums text-muted-foreground">{p.expires ? fmtDate(p.expires) : "—"}</span>
          ),
        }),
        personCol.display({
          id: "actions",
          enableHiding: false,
          cell: ({ row: { original: p } }) => (
            <div className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setGrantFor(p.user);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />Add role
              </Button>
            </div>
          ),
        }),
      ]),
    [me, roleById, unitName],
  );

  const roleColumns = useMemo(
    () =>
      roleCol.columns([
        roleCol.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
          enableHiding: false,
          cell: ({ row: { original: r } }) => (
            <div className="min-w-0 max-w-md">
              <p className="text-sm font-medium">{r.name}</p>
              {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
            </div>
          ),
        }),
        roleCol.accessor("kind", {
          header: "Type",
          enableSorting: false,
          filterFn: facetFilterFn,
          cell: ({ row: { original: r } }) => (
            <Badge variant="outline">{r.isSystem ? "Built-in" : "Custom"}</Badge>
          ),
        }),
        roleCol.display({
          id: "unit",
          header: "Unit-limitable",
          cell: ({ row: { original: r } }) => (
            <span className="text-sm text-muted-foreground">{isUnitScopable(r.permissions) ? "Yes" : "No"}</span>
          ),
        }),
        roleCol.accessor("assignmentCount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="People" />,
          cell: ({ row: { original: r } }) => <span className="text-sm tabular-nums">{r.assignmentCount}</span>,
        }),
      ]),
    [],
  );

  const selectedPerson = people.find((p) => p.id === personId) ?? null;
  const selectedRole = roleById.get(roleId ?? "") ?? null;

  return (
    <>
      <Tabs
        defaultValue={tab}
        onValueChange={(v) => router.replace(v === "roles" ? "/admin/users?tab=roles" : "/admin/users", { scroll: false })}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="people"><Users className="mr-1.5 h-4 w-4" />People</TabsTrigger>
            <TabsTrigger value="roles"><ShieldCheck className="mr-1.5 h-4 w-4" />Roles</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {mode === "super" && (
              <Button variant="outline" asChild>
                <Link href="/admin/users/roles/new"><Plus className="mr-1.5 h-4 w-4" />New role</Link>
              </Button>
            )}
            <Button onClick={() => setGrantFor(null)}><Plus className="mr-1.5 h-4 w-4" />Give access</Button>
          </div>
        </div>

        <TabsContent value="people" className="mt-4">
          <DataTable
            columns={peopleColumns}
            data={people}
            searchPlaceholder="Search by name or email…"
            emptyMessage="Nobody has admin access yet."
            onRowClick={(p) => setPersonId(p.id)}
            filters={[
              { id: "roles", title: "Role", options: roles.map((r) => ({ label: r.name, value: r.id })) },
              {
                id: "scopes",
                title: "Scope",
                options: [
                  { label: "Everywhere", value: EVERYWHERE },
                  ...units.map((u) => ({ label: `${u.name} only`, value: u.id })),
                ],
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <DataTable
            columns={roleColumns}
            data={roleRows}
            searchPlaceholder="Search roles…"
            emptyMessage="No roles yet."
            onRowClick={(r) => setRoleId(r.id)}
            filters={[
              {
                id: "kind",
                title: "Type",
                options: [
                  { label: "Built-in", value: "built-in" },
                  { label: "Custom", value: "custom" },
                ],
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <PersonSheet
        person={selectedPerson}
        me={me}
        mode={mode}
        roleById={roleById}
        unitName={unitName}
        onClose={() => setPersonId(null)}
        onAddRole={setGrantFor}
      />
      <RoleSheet
        role={selectedRole}
        mode={mode}
        holders={assignments.filter((a) => a.roleId === roleId)}
        unitName={unitName}
        onClose={() => setRoleId(null)}
      />

      {grantFor !== undefined && (
        <GrantDialog
          mode={mode}
          grantable={grantable}
          user={grantFor}
          roles={roles}
          units={units.filter((u) => u.isActive)}
          onClose={() => setGrantFor(undefined)}
          onDone={() => {
            setGrantFor(undefined);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
