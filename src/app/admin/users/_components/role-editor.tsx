"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAdminRole, saveAdminRole } from "@/actions/access";
import {
  AREA_KEYS,
  AREAS,
  areaLevel,
  isUnitScopable,
  permissionsInArea,
  presetKeys,
  summarizeAccess,
  type AreaKey,
  type AreaLevel,
} from "@/lib/rbac/catalog";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";
import { Checkbox } from "@/app/components/animate-ui/components/radix/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { AccessSummaryView } from "./access-summary";

const LEVELS: { value: Exclude<AreaLevel, "custom">; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View" },
  { value: "edit", label: "View & edit" },
  { value: "full", label: "Full (incl. sensitive)" },
];

const LEVEL_TAG = { view: "View", edit: "Edit", advanced: "Sensitive" } as const;

export function RoleEditor({
  role,
}: {
  role: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    people: number;
    unitLimited: number;
  } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [keys, setKeys] = useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function setArea(area: AreaKey, level: AreaLevel) {
    const inArea = new Set(permissionsInArea(area).map((d) => d.key));
    setKeys((prev) => [...prev.filter((k) => !inArea.has(k)), ...presetKeys(area, level)]);
  }
  function toggle(key: string, on: boolean) {
    setKeys((prev) => (on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)));
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await saveAdminRole({ id: role?.id, name, description, permissions: keys });
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push("/admin/users?tab=roles");
      router.refresh();
    });
  }

  const scopable = isUnitScopable(keys);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Media Team" maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who is this role for?"
                maxLength={300}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
            <CardDescription>
              Pick a level per area, or open an area to choose individual permissions.
              &ldquo;Sensitive&rdquo; ones (exports, sending, approvals, deletes, confidential notes) are only in Full.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple">
              {AREA_KEYS.map((area) => {
                const level = areaLevel(area, keys);
                return (
                  <AccordionItem key={area} value={area}>
                    <div className="flex items-center gap-3">
                      <AccordionTrigger className="flex-1">
                        <span>
                          <span className="block">{AREAS[area].label}</span>
                          <span className="block text-xs font-normal text-muted-foreground">{AREAS[area].hint}</span>
                        </span>
                      </AccordionTrigger>
                      <Select value={level} onValueChange={(v) => setArea(area, v as AreaLevel)}>
                        <SelectTrigger className="w-44 shrink-0" aria-label={`${AREAS[area].label} access`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Skip levels that grant nothing extra in this area (e.g. Admin access only has "Full"). */}
                          {LEVELS.filter(
                            (l, i) =>
                              i === 0 ||
                              presetKeys(area, l.value).length > presetKeys(area, LEVELS[i - 1].value).length,
                          ).map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                          {level === "custom" && <SelectItem value="custom" disabled>Custom</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <AccordionContent>
                      <ul className="space-y-2.5 pl-1">
                        {permissionsInArea(area).map((d) => (
                          <li key={d.key} className="flex items-center gap-3">
                            <Checkbox
                              id={`perm-${d.key}`}
                              size="sm"
                              checked={keys.includes(d.key)}
                              onCheckedChange={(on) => toggle(d.key, on === true)}
                            />
                            <Label htmlFor={`perm-${d.key}`} className="flex-1 font-normal">{d.label}</Label>
                            <Badge variant={d.level === "advanced" ? "destructive" : "outline"} className="text-[10px]">
                              {LEVEL_TAG[d.level]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">People with this role can</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccessSummaryView summary={summarizeAccess([{ permissions: keys, unit: null }])} />
            <p className="text-xs text-muted-foreground">
              {scopable
                ? "Can be limited to one church unit when you give it to someone."
                : "Always applies everywhere — some of these areas don't belong to a unit."}
            </p>
            {role && !scopable && role.unitLimited > 0 && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {role.unitLimited} {role.unitLimited === 1 ? "person has" : "people have"} this role limited to a unit, so it can
                only hold member and pastoral-care permissions. Saving will be refused.
              </p>
            )}
            {role && role.people > 0 && (
              <p className="text-xs text-muted-foreground">
                {role.people} {role.people === 1 ? "person has" : "people have"} this role.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/users?tab=roles")} disabled={saving}>Cancel</Button>
              <Button className="flex-1" onClick={save} disabled={saving || name.trim().length < 2 || keys.length === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {role ? "Save role" : "Create role"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {role && (
          <ConfirmDelete
            title={`Delete the ${role.name} role?`}
            description={
              role.people > 0
                ? `${role.people} ${role.people === 1 ? "person loses" : "people lose"} this access immediately.`
                : "Nobody has this role yet."
            }
            confirmLabel="Delete role"
            onConfirm={async () => {
              const res = await deleteAdminRole(role.id);
              if (res.success) {
                router.push("/admin/users?tab=roles");
                router.refresh();
              }
              return res;
            }}
            trigger={
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete role
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
