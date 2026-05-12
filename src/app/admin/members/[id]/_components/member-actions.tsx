"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, UserCheck } from "lucide-react";
import { approveMemberApplication } from "@/actions/member-applications";
import { sendMemberInvite } from "@/actions/member-invites";
import { Button } from "@/app/components/ui/button";

type Props = {
  memberId: string;
  status: string;
  email: string | null;
  userId: string | null;
  invite: {
    email: string;
    expiresAt: string;
    consumedAt: string | null;
  } | null;
};

export function MemberActions({ memberId, status, email, userId, invite }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  const canInvite = email && !userId;
  const inviteLabel = invite?.consumedAt
    ? "Invite used"
    : invite
      ? "Resend invite"
      : "Send invite";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "PENDING_APPROVAL" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(
                () => approveMemberApplication({ memberId }),
                "Application approved.",
              )
            }
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="mr-1.5 h-4 w-4" />
            )}
            Approve
          </Button>
        )}
        <Button
          size="sm"
          disabled={!canInvite || isPending}
          onClick={() =>
            run(() => sendMemberInvite({ memberId }), "Invite sent.")
          }
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <MailCheck className="mr-1.5 h-4 w-4" />
          )}
          {inviteLabel}
        </Button>
      </div>
      {message && (
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          {message}
        </p>
      )}
      {!email && (
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Add an email before sending portal access.
        </p>
      )}
      {invite && !invite.consumedAt && (
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Current invite expires {new Date(invite.expiresAt).toLocaleDateString()}.
        </p>
      )}
    </div>
  );
}
