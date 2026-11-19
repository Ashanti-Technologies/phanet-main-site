"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { startPledgePayment } from "@/actions/giving";
import { Button } from "@/app/components/ui/button";

export function PayPledgeButton({ commitmentId }: { commitmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="gap-1.5 bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await startPledgePayment(commitmentId).catch(() => ({
              ok: false as const,
              error: "Online giving is temporarily unavailable. Please try again later.",
            }));
            if (res.ok) window.location.assign(res.redirectUrl);
            else setError(res.error);
          })
        }
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        Pay now
      </Button>
      {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
