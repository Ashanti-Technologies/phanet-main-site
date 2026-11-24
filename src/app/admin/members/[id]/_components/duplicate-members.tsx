"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergeMemberInto } from "@/actions/members";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

export type DuplicateRow = {
  id: string;
  name: string;
  status: string;
  hasLogin: boolean;
  createdAt: string;
  reasons: string[];
  canMerge: boolean;
};

export function DuplicateMembers({ memberId, memberName, rows }: { memberId: string; memberName: string; rows: DuplicateRow[] }) {
  const router = useRouter();
  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/5">
      <p className="font-medium">Possible duplicate{rows.length > 1 ? "s" : ""}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Merging moves bookings, attendance, units, household, giving and notes onto this record, fills in anything this
        record is missing, then deletes the other one.
      </p>
      <ul className="mt-3 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <Link href={`/admin/members/${r.id}`} className="font-medium hover:underline">
                {r.name}
              </Link>
              <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                <Badge variant="outline">{r.status}</Badge>
                {r.hasLogin && <Badge variant="secondary">Has sign-in</Badge>}
              </span>
              <p className="text-xs text-muted-foreground">
                {r.reasons.join(", ")} · added {new Date(r.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            {r.canMerge && (
              <ConfirmDelete
                trigger={
                  <Button type="button" size="sm" variant="outline">
                    Merge into this record
                  </Button>
                }
                title={`Merge ${r.name} into ${memberName}?`}
                description={
                  <p>
                    Everything on {r.name}&apos;s record moves here and that record is deleted. This can&apos;t be
                    undone.
                  </p>
                }
                confirmLabel="Merge"
                onConfirm={async () => {
                  const res = await mergeMemberInto(memberId, r.id);
                  if (res.success) router.refresh();
                  return res;
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
