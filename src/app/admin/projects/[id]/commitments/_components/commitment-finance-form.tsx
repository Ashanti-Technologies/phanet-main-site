"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateCommitmentFinance } from "@/actions/commitments";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type CommitmentFinanceFormProps = {
  commitment: {
    id: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    amountCommitted: unknown;
    confirmedAmount?: unknown;
    confirmedAt?: Date | string | null;
    paymentNote?: string | null;
    internalNote?: string | null;
  };
};

function dateValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function CommitmentFinanceForm({
  commitment,
}: CommitmentFinanceFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(commitment.status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await updateCommitmentFinance({
        id: commitment.id,
        status,
        confirmedAmount:
          String(formData.get("confirmedAmount") || "") || null,
        confirmedAt: String(formData.get("confirmedAt") || "") || null,
        paymentNote: String(formData.get("paymentNote") || ""),
        internalNote: String(formData.get("internalNote") || ""),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="min-w-72 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input
          name="confirmedAmount"
          inputMode="decimal"
          defaultValue={String(
            commitment.confirmedAmount ?? commitment.amountCommitted
          )}
          aria-label="Confirmed amount"
        />
      </div>
      <Input
        name="confirmedAt"
        type="date"
        defaultValue={dateValue(commitment.confirmedAt)}
        aria-label="Confirmed date"
      />
      <Input
        name="paymentNote"
        defaultValue={commitment.paymentNote ?? ""}
        placeholder="Payment note"
        aria-label="Payment note"
      />
      <Input
        name="internalNote"
        defaultValue={commitment.internalNote ?? ""}
        placeholder="Internal note"
        aria-label="Internal note"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save finance
      </Button>
    </form>
  );
}
