"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { approveMemberApplication } from "@/actions/member-applications";
import { sendMemberInvite } from "@/actions/member-invites";
import { Button } from "@/app/components/ui/button";

export function MemberRowActions({
  memberId,
  status,
  email,
  userId,
}: {
  memberId: string;
  status: string;
  email: string | null;
  userId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  if (status !== "PENDING_APPROVAL" && userId) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {status === "PENDING_APPROVAL" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => approveMemberApplication({ memberId }))}
          >
            {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Approve
          </Button>
        )}
        {!userId && (
          <Button
            type="button"
            size="sm"
            disabled={!email || isPending}
            onClick={() => run(() => sendMemberInvite({ memberId }))}
          >
            Invite
          </Button>
        )}
      </div>
      {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
