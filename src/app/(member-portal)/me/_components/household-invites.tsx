"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2 } from "lucide-react";
import { respondToHouseholdInvite } from "@/actions/member-portal";
import { Button } from "@/app/components/ui/button";

type Invite = { id: string; fromName: string; relationship: "SPOUSE" | "CHILD" };

export function HouseholdInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function respond(inviteId: string, accept: boolean) {
    startTransition(async () => {
      try {
        setError("");
        await respondToHouseholdInvite({ inviteId, accept });
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {invites.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-(--shadow-soft)"
        >
          <p className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 shrink-0 text-midnight-green" />
            <span>
              <strong>{inv.fromName}</strong> added you as their{" "}
              {inv.relationship === "SPOUSE" ? "spouse" : "child"}. Join their household?
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={isPending} onClick={() => respond(inv.id, false)}>
              Decline
            </Button>
            <Button size="sm" disabled={isPending} onClick={() => respond(inv.id, true)}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Join household
            </Button>
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
