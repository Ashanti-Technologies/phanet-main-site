"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { setMyEventRsvp } from "@/actions/member-portal";
import { Button } from "@/app/components/ui/button";

export function DashboardEventRsvp({
  eventId,
  initialStatus,
}: {
  eventId: string;
  initialStatus: "GOING" | "CANCELLED" | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function update(next: "GOING" | "CANCELLED") {
    startTransition(async () => {
      await setMyEventRsvp({ eventId, status: next });
      setStatus(next);
      router.refresh();
    });
  }

  if (status === "GOING") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          You&apos;re going
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => update("CANCELLED")}
          className="text-xs text-emerald-900 hover:bg-emerald-100"
        >
          {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          Cancel RSVP
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => update("GOING")}
      disabled={isPending}
      className="w-full bg-mikado-yellow text-midnight-green hover:bg-mikado-yellow/90"
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      RSVP — I&apos;ll be there
    </Button>
  );
}
