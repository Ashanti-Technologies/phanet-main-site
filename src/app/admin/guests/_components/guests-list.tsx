"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { assignGuest, routeGuest } from "@/actions/guests";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { StatusBadge } from "@/app/admin/_components/status-badge";

type Guest = {
  id: string;
  heardFromLabel: string;
  plannedFor: Date | string;
  remindedAt: Date | string | null;
  createdAt: Date | string;
  unit: { id: string; name: string } | null;
  followUpTask: { status: "OPEN" | "DONE" | "CANCELLED"; assignedTo: { name: string } } | null;
  member: {
    id: string;
    fullName: string;
    status: string;
    place: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    contactHidden: boolean;
  };
};

const NATIONAL = "national";
const ME = "me";

const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function followUpBadge(task: Guest["followUpTask"]) {
  if (!task) return <StatusBadge status="NEW" label="Waiting" tone="warning" />;
  if (task.status === "OPEN") return <StatusBadge status="OPEN" label={`With ${task.assignedTo.name}`} tone="info" />;
  if (task.status === "DONE") return <StatusBadge status="DONE" label="Welcomed" tone="success" />;
  return <StatusBadge status="CANCELLED" label="Closed" tone="neutral" />;
}

/** wa.me wants digits only, with the country code (Ghana numbers usually start 0). */
function whatsappHref(number: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `233${digits.slice(1)}` : digits}`;
}

export function GuestsList({
  guests,
  chapters,
  users,
  canSeeMembers,
}: {
  guests: Guest[];
  chapters: { id: string; name: string }[];
  users: { id: string; name: string }[];
  canSeeMembers: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<Record<string, string>>({});

  async function run(guestId: string, fn: () => Promise<unknown>) {
    setBusy(guestId);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (guests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No guests here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {guests.map((g) => {
        const m = g.member;
        const who = assignee[g.id] ?? ME;
        return (
          <div key={g.id} className="space-y-3 rounded-md border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {canSeeMembers ? (
                    <Link href={`/admin/members/${m.id}`} className="hover:underline">
                      {m.fullName}
                    </Link>
                  ) : (
                    m.fullName
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Elim Hour {day(g.plannedFor)}
                  {g.remindedAt && " · reminded"} · signed up {day(g.createdAt)}
                  {m.place && <> · {m.place}</>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.status !== "VISITOR" && <StatusBadge status={m.status} />}
                {followUpBadge(g.followUpTask)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">Heard from:</span> {g.heardFromLabel}
              </span>
              {m.contactHidden ? (
                <span className="text-muted-foreground">Contact details hidden</span>
              ) : (
                <>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="h-3.5 w-3.5" aria-hidden /> {m.phone}
                    </a>
                  )}
                  {(m.whatsapp || m.phone) && (
                    <a
                      href={whatsappHref(m.whatsapp || m.phone!)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
                    </a>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:underline">
                      <Mail className="h-3.5 w-3.5" aria-hidden /> {m.email}
                    </a>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t pt-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`chapter-${g.id}`}>
                  Chapter
                </label>
                <Select
                  value={g.unit?.id ?? NATIONAL}
                  onValueChange={(v) =>
                    run(g.id, () => routeGuest({ guestId: g.id, unitId: v === NATIONAL ? null : v }))
                  }
                  disabled={busy === g.id}
                >
                  <SelectTrigger id={`chapter-${g.id}`} size="sm" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NATIONAL}>National (no chapter)</SelectItem>
                    {chapters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!g.followUpTask && (
                <div className="flex items-end gap-2">
                  {users.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`assignee-${g.id}`}>
                        Give to
                      </label>
                      <Select value={who} onValueChange={(v) => setAssignee((a) => ({ ...a, [g.id]: v }))}>
                        <SelectTrigger id={`assignee-${g.id}`} size="sm" className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ME}>Me</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    size="sm"
                    disabled={busy === g.id}
                    onClick={() =>
                      run(g.id, () =>
                        assignGuest({ guestId: g.id, assignedToId: who === ME ? undefined : who }),
                      )
                    }
                  >
                    {busy === g.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {who === ME ? "I'll welcome them" : "Assign"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
