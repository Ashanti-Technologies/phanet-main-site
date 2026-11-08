"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserRound } from "lucide-react";
import { updateUserRoles } from "@/actions/admin-users";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { DataTable } from "@/app/components/data-table/data-table";
import { DataTableColumnHeader } from "@/app/components/data-table/data-table-column-header";
import { columnHelper } from "@/app/components/data-table/features";
import {
  ROLES,
  ROLE_DEFINITIONS,
  ALL_ROLE_KEYS,
  hasAnyAdminRole,
  type RoleKey,
} from "@/lib/rbac/roles";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date | string;
  roles: RoleKey[];
  unitIds: string[];
};

type UnitRow = { id: string; name: string; isActive: boolean };

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

const NO_ROLES = "__none";

const col = columnHelper<UserRow>();

function userColumns(onEdit: (user: UserRow) => void) {
  return col.columns([
    // Name + email in one value so the search box matches either.
    col.accessor((u) => `${u.name} ${u.email}`, {
      id: "user",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium leading-tight truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        );
      },
    }),
    col.accessor("roles", {
      header: "Roles",
      enableSorting: false,
      // Facet counts per role (and "No roles"), not per role combination.
      getUniqueValues: (u) => (u.roles.length ? u.roles : [NO_ROLES]),
      filterFn: (row, id, selected: string[]) => {
        const roles = row.original.roles;
        return roles.length
          ? roles.some((r) => selected.includes(r))
          : selected.includes(NO_ROLES);
      },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : (
            row.original.roles.map((r) => (
              <Badge
                key={r}
                variant="outline"
                className={
                  ROLE_DEFINITIONS[r].isAdminRole
                    ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
                    : ""
                }
              >
                {ROLE_DEFINITIONS[r].label}
              </Badge>
            ))
          )}
        </div>
      ),
    }),
    col.accessor((u) => new Date(u.createdAt), {
      id: "joined",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {getValue().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    }),
    col.display({
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={() => onEdit(row.original)}>
            Manage access
          </Button>
        </div>
      ),
    }),
  ]);
}

export function UsersTable({
  users,
  units,
}: {
  users: UserRow[];
  units: UnitRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const columns = useMemo(() => userColumns(setEditing), []);
  const adminCount = users.filter((u) => hasAnyAdminRole(u.roles)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="gap-1.5">
          <UserRound className="h-3 w-3" />
          {users.length} total
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3 w-3" />
          {adminCount} admin{adminCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search by name or email…"
        emptyMessage="No users yet."
        filters={[
          {
            id: "roles",
            title: "Role",
            options: [
              ...ALL_ROLE_KEYS.map((key) => ({
                value: key,
                label: ROLE_DEFINITIONS[key].label,
              })),
              { value: NO_ROLES, label: "No roles" },
            ],
          },
        ]}
      />

      {editing && (
        <EditAccessDialog
          user={editing}
          units={units}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditAccessDialog({
  user,
  units,
  onClose,
  onSaved,
}: {
  user: UserRow;
  units: UnitRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<RoleKey[]>(user.roles);
  const [unitIds, setUnitIds] = useState<string[]>(user.unitIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showUnits = roles.includes(ROLES.UNIT_LEADER);

  function toggleRole(role: RoleKey, on: boolean) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (on) next.add(role);
      else next.delete(role);
      return Array.from(next);
    });
  }
  function toggleUnit(id: string, on: boolean) {
    setUnitIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateUserRoles({
        userId: user.id,
        roles,
        unitIds: showUnits ? unitIds : [],
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage access — {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Roles</h3>
            <div className="space-y-2.5">
              {ALL_ROLE_KEYS.map((key) => {
                const def = ROLE_DEFINITIONS[key];
                return (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <Label
                        htmlFor={`role-${key}`}
                        className="text-sm font-medium"
                      >
                        {def.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {def.description}
                      </p>
                    </div>
                    <Switch
                      id={`role-${key}`}
                      checked={roles.includes(key)}
                      onCheckedChange={(on) => toggleRole(key, on)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {showUnits && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Assigned units</h3>
                <p className="text-xs text-muted-foreground">
                  Unit leaders only have edit access to members in these units.
                </p>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-md border p-3">
                {units.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active church units configured yet.
                  </p>
                ) : (
                  units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <Label htmlFor={`unit-${u.id}`} className="text-sm">
                        {u.name}
                      </Label>
                      <Switch
                        id={`unit-${u.id}`}
                        checked={unitIds.includes(u.id)}
                        onCheckedChange={(on) => toggleUnit(u.id, on)}
                      />
                    </div>
                  ))
                )}
              </div>
              {showUnits && unitIds.length === 0 && (
                <p className="text-xs text-destructive">
                  Pick at least one unit for the Unit Leader role.
                </p>
              )}
            </section>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving || (showUnits && unitIds.length === 0)
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
