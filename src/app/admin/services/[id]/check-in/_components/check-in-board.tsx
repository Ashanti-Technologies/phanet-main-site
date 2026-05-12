"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Search,
  CheckCircle2,
  Loader2,
  X,
  UserCheck,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  searchMembersForCheckIn,
  recordAttendance,
  removeAttendance,
} from "@/actions/attendance";

type PresentRow = {
  id: string;
  memberId: string;
  fullName: string;
  preferredName: string | null;
  photoUrl: string | null;
  checkedInAt: string;
};

type SearchHit = {
  id: string;
  fullName: string;
  preferredName: string | null;
  photoUrl: string | null;
  phone: string | null;
  units: { unit: { name: string } }[];
};

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

export function CheckInBoard({
  serviceId,
  initialPresent,
}: {
  serviceId: string;
  initialPresent: PresentRow[];
}) {
  const [present, setPresent] = useState<PresentRow[]>(initialPresent);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(
    new Set(initialPresent.map((p) => p.memberId)),
  );
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchRef.current) window.clearTimeout(searchRef.current);
    if (q.trim().length < 2) return;
    searchRef.current = window.setTimeout(async () => {
      const res = await searchMembersForCheckIn(serviceId, q);
      setHits(res.items);
      setCheckedInIds(
        (prev) => new Set([...prev, ...res.checkedInIds]),
      );
    }, 200);
    return () => {
      if (searchRef.current) window.clearTimeout(searchRef.current);
    };
  }, [q, serviceId]);

  function onQueryChange(value: string) {
    setQ(value);
    if (value.trim().length < 2) setHits([]);
  }

  function checkIn(hit: SearchHit) {
    if (checkedInIds.has(hit.id)) return;
    setCheckedInIds(new Set([...checkedInIds, hit.id]));
    setPresent([
      {
        id: `optimistic-${hit.id}`,
        memberId: hit.id,
        fullName: hit.fullName,
        preferredName: hit.preferredName,
        photoUrl: hit.photoUrl,
        checkedInAt: new Date().toISOString(),
      },
      ...present.filter((p) => p.memberId !== hit.id),
    ]);
    startTransition(async () => {
      await recordAttendance({ serviceId, memberId: hit.id, method: "MANUAL" });
    });
  }

  function undo(memberId: string) {
    setCheckedInIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
    setPresent((prev) => prev.filter((p) => p.memberId !== memberId));
    startTransition(async () => {
      await removeAttendance({ serviceId, memberId });
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search name or phone…"
            className="pl-8 h-10"
          />
        </div>

        <div className="rounded-md border min-h-[200px]">
          {q.trim().length < 2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Start typing to search members.
            </p>
          ) : hits.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No members match.
            </p>
          ) : (
            <ul className="divide-y">
              {hits.map((h) => {
                const isCheckedIn = checkedInIds.has(h.id);
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      disabled={isCheckedIn || pending}
                      onClick={() => checkIn(h)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Avatar className="h-10 w-10">
                        {h.photoUrl ? (
                          <AvatarImage src={h.photoUrl} alt={h.fullName} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {initials(h.preferredName ?? h.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {h.preferredName ?? h.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {h.phone ?? "—"}
                          {h.units[0]
                            ? ` · ${h.units[0].unit.name}`
                            : ""}
                        </p>
                      </div>
                      {isCheckedIn ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 border-emerald-500/40 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                        </Badge>
                      ) : (
                        <Badge variant="outline">Tap to check in</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Present ({present.length})
          </h3>
          {pending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto">
          {present.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No check-ins yet.
            </p>
          ) : (
            <ul className="divide-y">
              {present.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40"
                >
                  <Avatar className="h-9 w-9">
                    {p.photoUrl ? (
                      <AvatarImage src={p.photoUrl} alt={p.fullName} />
                    ) : null}
                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                      {initials(p.preferredName ?? p.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {p.preferredName ?? p.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.checkedInAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => undo(p.memberId)}
                    aria-label="Undo check-in"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
