"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptMemberInvite } from "@/actions/member-invites";
import { Button } from "@/app/components/ui/button";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptMemberInvite({ token });
        router.push("/me/profile?claimed=1");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Invite could not be accepted",
        );
      }
    });
  }

  return (
    <div className="space-y-4" aria-busy={isPending}>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        type="button"
        onClick={accept}
        disabled={isPending}
        className="w-full bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Accept invite &amp; sign in
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No password needed. We&apos;ll sign you in and take you to your
        profile.
      </p>
    </div>
  );
}
