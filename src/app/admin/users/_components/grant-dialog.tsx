"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { grantAccess, searchUsersForAccess } from "@/actions/access";
import { isUnitScopable, summarizeAccess } from "@/lib/rbac/catalog";
import { Button } from "@/app/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { AccessSummaryView } from "./access-summary";
import type { AccessMode, RoleRow, UnitRow } from "./access-manager";

export type GrantUser = { id: string; name: string; email: string; image: string | null };

const EVERYWHERE = "__everywhere";

export function GrantDialog({
  mode,
  grantable,
  user: presetUser,
  roles,
  units,
  onClose,
  onDone,
}: {
  mode: AccessMode;
  grantable: Record<string, string[]>;
  user: GrantUser | null;
  roles: RoleRow[];
  units: UnitRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [user, setUser] = useState<GrantUser | null>(presetUser);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GrantUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [roleId, setRoleId] = useState("");
  // Delegates always work inside one of their units, chosen first.
  const delegate = mode === "delegate";
  const [scope, setScope] = useState(delegate && units.length === 1 ? units[0].id : EVERYWHERE);
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (user || q.trim().length < 2) {
      setHits([]);
      return;
    }
    if (delegate && scope === EVERYWHERE) return;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setHits(await searchUsersForAccess(q, delegate ? scope : null));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, user, delegate, scope]);

  const roleOptions = delegate ? roles.filter((r) => (grantable[scope] ?? []).includes(r.id)) : roles;
  const role = roleOptions.find((r) => r.id === roleId);
  const scopable = role ? isUnitScopable(role.permissions) : false;
  const unitId = (delegate || scopable) && scope !== EVERYWHERE ? scope : null;
  const unitName = units.find((u) => u.id === unitId)?.name ?? null;
  const today = new Date().toISOString().slice(0, 10);

  function submit() {
    if (!user || !role) return;
    setError(null);
    startSaving(async () => {
      const res = await grantAccess({
        userId: user.id,
        roleId: role.id,
        unitId,
        // End of the chosen day, local time.
        expiresAt: until ? new Date(`${until}T23:59:59`) : null,
      });
      if (res.success) onDone();
      else setError(res.error);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Give admin access</DialogTitle>
          <DialogDescription>
            They&apos;ll get it the next time they load a page. Every change is logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {delegate && (
            <div className="space-y-2">
              <Label htmlFor="grant-unit">Unit</Label>
              <Select
                value={scope === EVERYWHERE ? "" : scope}
                onValueChange={(v) => {
                  setScope(v);
                  setRoleId("");
                  if (!presetUser) setUser(null);
                }}
              >
                <SelectTrigger id="grant-unit"><SelectValue placeholder="Pick your unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can give access to members of this unit, limited to this unit.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Person</Label>
            {user ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                {!presetUser && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setUser(null)} aria-label="Pick someone else">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <Command shouldFilter={false} className="rounded-md border">
                <CommandInput
                  placeholder={delegate && scope === EVERYWHERE ? "Pick a unit first" : "Search name or email…"}
                  value={q}
                  onValueChange={setQ}
                  disabled={delegate && scope === EVERYWHERE}
                />
                <CommandList>
                  {q.trim().length >= 2 && !searching && (
                    <CommandEmpty>
                      {delegate
                        ? "No one in this unit matches. They must be a member of the unit and have signed in to the website once."
                        : "No account found. They need to sign in to the website once (or accept a member invite) before you can give them access."}
                    </CommandEmpty>
                  )}
                  {hits.map((h) => (
                    <CommandItem key={h.id} value={h.id} onSelect={() => setUser(h)}>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{h.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{h.email}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="grant-role"><SelectValue placeholder="Pick a role" /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role?.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
          </div>

          {delegate && scope !== EVERYWHERE && roleOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No roles fit within your own access in this unit. Ask a Super Admin.
            </p>
          )}

          {role && !delegate && (
            <div className="space-y-2">
              <Label htmlFor="grant-scope">Where</Label>
              <Select value={scopable ? scope : EVERYWHERE} onValueChange={setScope} disabled={!scopable}>
                <SelectTrigger id="grant-scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERYWHERE}>Everywhere</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>Only members of {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {scopable
                  ? "Limiting to a unit restricts member records and pastoral care to people in that unit."
                  : "This role covers areas that don't belong to a unit (like content or finance), so it always applies everywhere."}
              </p>
            </div>
          )}

          {role && !role.isSystem && (
            <div className="space-y-2">
              <Label htmlFor="grant-until">Access ends (optional)</Label>
              <Input id="grant-until" type="date" min={today} value={until} onChange={(e) => setUntil(e.target.value)} />
              <p className="text-xs text-muted-foreground">Handy for event volunteers. Leave blank to keep it until removed.</p>
            </div>
          )}

          {role && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">They&apos;ll be able to</p>
              <AccessSummaryView summary={summarizeAccess([{ permissions: role.permissions, unit: unitName }])} />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!user || !role || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Give access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
