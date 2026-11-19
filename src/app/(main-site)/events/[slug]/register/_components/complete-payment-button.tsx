"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { startEventPayment } from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";

/** Opens Paystack checkout for the balance on the signed-in member's booking. */
export function CompletePaymentButton({ eventId, label }: { eventId: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await startEventPayment(eventId);
            if (res.success) window.location.href = res.data.payUrl;
            else setError(res.error);
          })
        }
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
