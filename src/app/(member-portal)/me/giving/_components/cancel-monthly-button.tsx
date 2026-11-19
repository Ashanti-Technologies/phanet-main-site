"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelMyRecurringGift } from "@/actions/giving";
import { Button } from "@/app/components/ui/button";

export function CancelMonthlyButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this monthly gift? Past gifts are not affected.")) return;
        startTransition(async () => {
          await cancelMyRecurringGift(id);
          router.refresh();
        });
      }}
    >
      {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
      Cancel
    </Button>
  );
}
