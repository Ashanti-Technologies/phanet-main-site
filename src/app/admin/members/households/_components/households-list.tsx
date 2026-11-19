"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteHousehold } from "@/actions/households";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

type Row = { id: string; name: string; memberCount: number };

export function HouseholdsList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);

  async function handleDelete(id: string) {
    await deleteHousehold(id);
    setRows((rs) => rs.filter((r) => r.id !== id));
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
          <ConfirmDelete
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`}>
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            }
            title={`Delete the ${row.name} household?`}
            description="Its members are kept but become unassigned."
            confirmLabel="Delete household"
            onConfirm={() => handleDelete(row.id)}
          />
        </div>
      ))}
    </div>
  );
}
