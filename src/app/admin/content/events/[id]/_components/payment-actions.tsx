"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelPendingRegistration, recordEventPayment } from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

const METHODS: [string, string][] = [
  ["CASH", "Cash"],
  ["MOMO", "Mobile Money"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CARD", "Card"],
  ["CHEQUE", "Cheque"],
  ["OTHER", "Other"],
];

/** Desk staff record money taken at the event for one booking. */
export function RecordPaymentDialog({
  registrationId,
  bookedBy,
  balance,
}: {
  registrationId: string;
  bookedBy: string;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setError(null);
      const res = await recordEventPayment(registrationId, { amount, method, reference });
      if (!res.success) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setAmount(String(balance));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {bookedBy}&apos;s booking · GH₵{balance.toFixed(2)} owed. This is added to the event&apos;s fund in Finance.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (GH₵)</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={balance}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-ref">Reference (optional)</Label>
            <Input
              id="pay-ref"
              placeholder="MoMo transaction ID, receipt number…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record GH₵{Number(amount || 0).toFixed(2)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Remove an abandoned "awaiting payment" booking so its people can book again. */
export function ClearPendingButton({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (!confirm) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(true)}>
        Clear
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await cancelPendingRegistration(registrationId);
            if (!res.success) return setError(res.error);
            router.refresh();
          })
        }
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Yes, clear booking
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Keep
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </span>
  );
}
