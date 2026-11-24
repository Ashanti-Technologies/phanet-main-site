"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { discardRegistrationDraft, sendRegistrationReminder } from "@/actions/event-registrations";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Button } from "@/app/components/ui/button";

/** Send one "finish your registration" email (+ SMS) now. */
export function RemindButton({ draftId, disabled }: { draftId: string; disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        title={disabled ? "Reminder limit reached" : undefined}
        onClick={() =>
          startTransition(async () => {
            const res = await sendRegistrationReminder(draftId);
            setMessage(res.success ? "Sent" : res.error);
            if (res.success) router.refresh();
          })
        }
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Remind
      </Button>
    </span>
  );
}

export function DiscardDraftButton({ draftId, name }: { draftId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      trigger={
        <Button type="button" variant="ghost" size="sm">
          Discard
        </Button>
      }
      title="Discard this unfinished registration?"
      description={<p>{name}&apos;s saved answers will be deleted and they won&apos;t get reminders.</p>}
      confirmLabel="Discard"
      onConfirm={async () => {
        const res = await discardRegistrationDraft(draftId);
        if (res.success) router.refresh();
        return res;
      }}
    />
  );
}
