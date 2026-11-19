"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteEventRegistration, recordEventPayment } from "@/actions/event-registrations";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { formatMoney } from "@/lib/format";
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
export function ClearPendingButton({ registrationId, name }: { registrationId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      trigger={
        <Button type="button" variant="ghost" size="sm">
          Clear
        </Button>
      }
      title="Clear this unpaid booking?"
      description={<p>{name}&apos;s booking is still awaiting payment. Clearing it lets these people book again.</p>}
      confirmLabel="Clear booking"
      onConfirm={async () => {
        const res = await deleteEventRegistration(registrationId);
        if (res.success) router.refresh();
        return res;
      }}
    />
  );
}

/** Delete a confirmed booking (everyone on it). Refused while money is recorded against it. */
export function DeleteBookingButton({
  registrationId,
  bookedBy,
  people,
  amountPaid,
}: {
  registrationId: string;
  bookedBy: string;
  people: string[];
  amountPaid: number;
}) {
  const router = useRouter();
  const paid = amountPaid > 0;
  return (
    <ConfirmDelete
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${bookedBy}'s booking`}
          title={paid ? "Has a payment recorded: ask finance to void it first" : "Delete booking"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      title={`Delete ${bookedBy}'s booking?`}
      description={
        <>
          <p>
            This removes the whole booking ({people.length} {people.length === 1 ? "person" : "people"}:{" "}
            {people.join(", ")}), including room assignments and check-ins. Member records are kept.
          </p>
          {paid && (
            <p className="font-medium text-foreground">
              {formatMoney(amountPaid)} has been paid on this booking, so it can&apos;t be deleted until finance
              voids or refunds the payment.
            </p>
          )}
        </>
      }
      confirmLabel="Delete booking"
      onConfirm={async () => {
        const res = await deleteEventRegistration(registrationId);
        if (res.success) router.refresh();
        return res;
      }}
    />
  );
}
