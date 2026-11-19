"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus, Trash2 } from "lucide-react";
import { revokeAccess, startPreview } from "@/actions/access";
import { isUnitScopable, summarizeAccess } from "@/lib/rbac/catalog";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { AccessSummaryView } from "./access-summary";
import type { AccessMode, AssignmentRow, RoleRow } from "./access-manager";
import type { GrantUser } from "./grant-dialog";

export function initials(name: string) {
  return (
    name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UserAvatar({ user, className = "h-9 w-9" }: { user: GrantUser; className?: string }) {
  return (
    <Avatar className={className}>
      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
      <AvatarFallback className="bg-muted text-xs text-muted-foreground">{initials(user.name)}</AvatarFallback>
    </Avatar>
  );
}

const scopeLabel = (a: AssignmentRow, unitName: Map<string, string>) =>
  a.unitId ? `${unitName.get(a.unitId) ?? "Unit"} only` : "Everywhere";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </section>
);

export function PersonSheet({
  person,
  me,
  mode,
  roleById,
  unitName,
  onClose,
  onAddRole,
}: {
  person: { user: GrantUser; items: AssignmentRow[] } | null;
  me: string;
  mode: AccessMode;
  roleById: Map<string, RoleRow>;
  unitName: Map<string, string>;
  onClose: () => void;
  onAddRole: (user: GrantUser) => void;
}) {
  const router = useRouter();
  const summary = person
    ? summarizeAccess(
        person.items
          .filter((a) => !a.expired)
          .map((a) => ({
            permissions: roleById.get(a.roleId)?.permissions ?? [],
            unit: a.unitId ? unitName.get(a.unitId) ?? "a unit" : null,
          })),
      )
    : null;

  return (
    <Sheet open={!!person} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {person && summary && (
          <>
            <SheetHeader className="flex-row items-center gap-3 border-b pr-10">
              <UserAvatar user={person.user} className="h-11 w-11" />
              <div className="min-w-0">
                <SheetTitle className="truncate">
                  {person.user.name}
                  {person.user.id === me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                </SheetTitle>
                <SheetDescription className="truncate">{person.user.email}</SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <Section title="Roles">
                <ul className="divide-y rounded-md border">
                  {person.items.map((a) => {
                    const role = roleById.get(a.roleId);
                    return (
                      <li key={a.id} className={`flex items-start justify-between gap-3 p-3 ${a.expired ? "opacity-60" : ""}`}>
                        <div className="min-w-0 space-y-0.5 text-sm">
                          <p className={`font-medium ${a.expired ? "line-through" : ""}`}>{role?.name ?? "Deleted role"}</p>
                          <p className="text-muted-foreground">
                            {scopeLabel(a, unitName)}
                            {a.expiresAt && ` · ${a.expired ? "ended" : "until"} ${fmtDate(a.expiresAt)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Given {fmtDate(a.createdAt)}
                            {a.grantedBy && ` by ${a.grantedBy}`}
                          </p>
                        </div>
                        {a.canRevoke && (
                        <ConfirmDelete
                          title={`Remove ${role?.name ?? "this role"} from ${person.user.name}?`}
                          description={
                            <span>
                              They lose this access immediately.
                              {role?.isSystem && " They'll no longer be able to manage admin access."}
                            </span>
                          }
                          confirmLabel="Remove access"
                          onConfirm={async () => {
                            const res = await revokeAccess(a.id);
                            if (res.success) router.refresh();
                            return res;
                          }}
                          trigger={
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Remove ${role?.name ?? "role"}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>

              <Section title="What they can do">
                <div className="rounded-md bg-muted/50 p-3">
                  <AccessSummaryView summary={summary} />
                </div>
              </Section>
            </div>

            <SheetFooter className="border-t">
              {mode === "super" && person.user.id !== me && person.items.some((a) => !a.expired) && (
                <form action={startPreview.bind(null, person.user.id)}>
                  <Button type="submit" variant="outline" className="w-full">
                    <Eye className="mr-1.5 h-4 w-4" />View as {person.user.name.split(/\s+/)[0]}
                  </Button>
                </form>
              )}
              <Button onClick={() => onAddRole(person.user)}>
                <Plus className="mr-1.5 h-4 w-4" />Add role
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function RoleSheet({
  role,
  mode,
  holders,
  unitName,
  onClose,
}: {
  role: RoleRow | null;
  mode: AccessMode;
  holders: AssignmentRow[];
  unitName: Map<string, string>;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!role} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {role && (
          <>
            <SheetHeader className="border-b pr-10">
              <SheetTitle>{role.name}</SheetTitle>
              {role.description && <SheetDescription>{role.description}</SheetDescription>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline">{role.isSystem ? "Built-in" : "Custom"}</Badge>
                {isUnitScopable(role.permissions) && <Badge variant="outline">Can limit to a unit</Badge>}
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <Section title="What it allows">
                <div className="rounded-md bg-muted/50 p-3">
                  <AccessSummaryView summary={summarizeAccess([{ permissions: role.permissions, unit: null }])} />
                </div>
              </Section>

              <Section title={`People (${holders.length})`}>
                {holders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nobody has this role.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {holders.map((a) => (
                      <li key={a.id} className={`flex items-center gap-3 p-3 ${a.expired ? "opacity-60" : ""}`}>
                        <UserAvatar user={a.user} className="h-8 w-8" />
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-medium">{a.user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {scopeLabel(a, unitName)}
                            {a.expiresAt && ` · ${a.expired ? "ended" : "until"} ${fmtDate(a.expiresAt)}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            {mode === "super" && !role.isSystem && (
              <SheetFooter className="border-t">
                <Button variant="outline" asChild>
                  <Link href={`/admin/users/roles/${role.id}`}>Edit role</Link>
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
