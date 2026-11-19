"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import { voidExpense, voidIncome } from "@/actions/finance";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

/** Entries are never deleted — voiding keeps them for the audit trail. */
export function VoidButton({
  id,
  kind,
  size = "sm",
}: {
  id: string;
  kind: "income" | "expense";
  size?: "sm" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await (kind === "income" ? voidIncome : voidExpense)({ id, reason });
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to void");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className="text-destructive hover:text-destructive"
          aria-label="Void entry"
        >
          <Ban className="h-4 w-4" />
          {size !== "icon" && <span className="ml-1.5">Void</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this {kind}?</DialogTitle>
          <DialogDescription>
            It stays on record but no longer counts in any total. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">Reason *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Entered twice, wrong amount"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={pending || reason.trim().length < 3}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void {kind}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
