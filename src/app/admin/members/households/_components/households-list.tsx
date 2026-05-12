"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteHousehold } from "@/actions/households";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

type Row = { id: string; name: string; memberCount: number };

export function HouseholdsList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this household? Members stay but become unassigned."))
      return;
    setBusy(id);
    try {
      await deleteHousehold(id);
      setRows(rows.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No households yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 rounded-md border p-3"
        >
          <Link
            href={`/admin/members/households/${row.id}`}
            className="flex-1 font-medium text-sm hover:underline"
          >
            {row.name}
          </Link>
          <Badge variant="outline">
            {row.memberCount} member{row.memberCount === 1 ? "" : "s"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
            disabled={busy === row.id}
          >
            {busy === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
